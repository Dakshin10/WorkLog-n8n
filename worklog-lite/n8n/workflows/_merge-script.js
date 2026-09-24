#!/usr/bin/env node
/**
 * Merge the 13 WorkLog AI Lite n8n sub-workflows into a single combined workflow JSON.
 *
 * Strategy:
 * - Every `n8n-nodes-base.executeWorkflow` node is replaced in-place by a full copy of the
 *   target sub-workflow's node graph.
 * - The sub-workflow's `executeWorkflowTrigger` node is NOT deleted outright; instead it is
 *   repurposed as an "adapter" Code node that reconstructs the exact JSON shape the trigger
 *   used to hand to its downstream nodes, built from the original Execute Workflow node's
 *   `workflowInputs.value` mapping. Keeping the same node id/name (just prefixed) means any
 *   internal `$('When Executed by Another Workflow')` references inside the sub-workflow keep
 *   resolving correctly after the global rename pass, with no special-casing needed.
 * - Every node in the copied subgraph (including the ex-trigger/adapter) gets a unique prefix
 *   per call-site so ids/names never collide, even across multiple call-sites of the same
 *   sub-workflow, or nested inlining (e.g. WF-10 inlined inside WF-08 inlined inside WF-01).
 * - The terminal ("sink") node(s) of the copied subgraph -- nodes with no outgoing connection
 *   inside the subgraph -- are renamed to the ORIGINAL Execute Workflow node's display name, so
 *   any `$('WF-08 Verify PIN')`-style references elsewhere in the flow keep working untouched.
 * - Nested Execute Workflow nodes inside a sub-workflow are resolved recursively, depth-first,
 *   before the copy is spliced into the parent, so by insertion time the copy is fully inlined.
 */

const fs = require('fs');
const path = require('path');

const V1_DIR = path.join(__dirname, 'v1');
const OUT_FILE = path.join(__dirname, 'WorkLog-Lite-Combined.json');

const FILES = {
  'WF-01_Chat_Orchestrator': 'WF-01_Chat_Orchestrator.json',
  'WF-02_SUB_Session_Store': 'WF-02_SUB_Session_Store.json',
  'WF-03_SUB_Identity': 'WF-03_SUB_Identity.json',
  'WF-04_SUB_Reference_Data': 'WF-04_SUB_Reference_Data.json',
  'WF-05_SUB_Scrub_Unscrub': 'WF-05_SUB_Scrub_Unscrub.json',
  'WF-06_SUB_Extract_Gemini': 'WF-06_SUB_Extract_Gemini.json',
  'WF-07_SUB_Validate_Entry': 'WF-07_SUB_Validate_Entry.json',
  'WF-08_SUB_Verify_PIN': 'WF-08_SUB_Verify_PIN.json',
  'WF-09_SUB_Append_Entry': 'WF-09_SUB_Append_Entry.json',
  'WF-10_SUB_Audit': 'WF-10_SUB_Audit.json',
  'WF-11_Global_Error_Handler': 'WF-11_Global_Error_Handler.json',
  'WF-12_Maintenance': 'WF-12_Maintenance.json',
  'WF-13_PIN_Enrolment': 'WF-13_PIN_Enrolment.json',
};

const raw = {};
for (const [key, file] of Object.entries(FILES)) {
  raw[key] = JSON.parse(fs.readFileSync(path.join(V1_DIR, file), 'utf8'));
}

const log = [];
function note(msg) { log.push(msg); console.log(msg); }

let uidCounter = 0;
function uid() { return (uidCounter++).toString(36); }

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Sanitize a call-site node id into a short prefix usable in node ids/names.
function makePrefix(callSiteId) {
  return callSiteId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '__';
}

/**
 * Rewrite all $('OldName') / $("OldName") references inside a JS string blob according to
 * a rename map { oldName: newName }. Applied to the JSON-stringified node array so it touches
 * jsCode strings, expression strings, etc. all at once. Order by descending name length so a
 * name that is a substring of another doesn't get partially clobbered.
 */
function rewriteNodeNameRefs(text, renameMap) {
  const names = Object.keys(renameMap).sort((a, b) => b.length - a.length);
  for (const oldName of names) {
    const newName = renameMap[oldName];
    if (oldName === newName) continue;
    const esc = escapeRegExp(oldName);
    // Match $('Name') or $("Name") forms used by n8n expressions/code.
    const re = new RegExp(`(\\$\\(\\s*['"])${esc}(['"]\\s*\\))`, 'g');
    text = text.replace(re, `$1${newName}$2`);
  }
  return text;
}

function findTriggerNode(nodes) {
  return nodes.find(n => n.type === 'n8n-nodes-base.executeWorkflowTrigger');
}

function isStickyNote(n) { return n.type === 'n8n-nodes-base.stickyNote'; }

// Build the set of node names that have at least one outgoing connection.
function nodesWithOutgoing(connections) {
  return new Set(Object.keys(connections).filter(k => {
    const c = connections[k];
    if (!c) return false;
    return Object.values(c).some(portArr => Array.isArray(portArr) && portArr.some(conns => Array.isArray(conns) && conns.length > 0));
  }));
}

// Rename a single node throughout a connections object: both as a source key AND wherever it
// appears as a target (conn.node) in any other source's port arrays.
function renameNodeInConnections(connections, oldName, newName) {
  if (oldName === newName) return connections;
  const out = {};
  for (const [srcName, portMap] of Object.entries(connections)) {
    const newSrcName = srcName === oldName ? newName : srcName;
    const newPortMap = {};
    for (const [port, connArrArr] of Object.entries(portMap)) {
      newPortMap[port] = connArrArr.map(connArr =>
        connArr.map(conn => conn.node === oldName ? { ...conn, node: newName } : conn)
      );
    }
    out[newSrcName] = newPortMap;
  }
  return out;
}

function findSinkNodes(nodes, connections) {
  const withOutgoing = nodesWithOutgoing(connections);
  return nodes.filter(n => !isStickyNote(n) && !withOutgoing.has(n.name));
}

/**
 * Build the adapter Code node body from the original Execute Workflow node's
 * workflowInputs.value mapping.
 */
function buildAdapterCode(workflowInputsValue) {
  const lines = [];
  for (const [key, rawVal] of Object.entries(workflowInputsValue || {})) {
    let jsExpr;
    if (typeof rawVal === 'string' && rawVal.startsWith('=')) {
      let expr = rawVal.slice(1).trim();
      if (expr.startsWith('{{') && expr.endsWith('}}')) {
        expr = expr.slice(2, -2).trim();
      }
      jsExpr = expr;
    } else {
      jsExpr = JSON.stringify(rawVal === undefined ? null : rawVal);
    }
    lines.push(`  ${JSON.stringify(key)}: (${jsExpr})`);
  }
  return `// Adapter: reconstructs the workflowInputs shape the sub-workflow's trigger used to receive.\nreturn [{ json: {\n${lines.join(',\n')}\n} }];`;
}

/**
 * Recursively inline a call to `targetKey` sub-workflow made from `callSiteNode`.
 * Returns { nodes, connections, adapterName, sinkNames, offsetApplied }.
 */
function inlineCall(targetKey, callSiteNode, depth) {
  const subWfSrc = raw[targetKey];
  if (!subWfSrc) throw new Error(`Unknown sub-workflow reference: ${targetKey}`);

  // Deep clone.
  let subNodes = JSON.parse(JSON.stringify(subWfSrc.nodes));
  let subConnections = JSON.parse(JSON.stringify(subWfSrc.connections));

  const triggerNode = findTriggerNode(subNodes);
  if (!triggerNode) throw new Error(`No executeWorkflowTrigger found in ${targetKey}`);

  // First, recursively resolve any nested Execute Workflow nodes INSIDE this subgraph,
  // depth-first, so that by the time we splice this copy into the parent it is fully inlined.
  const nestedExecNodes = subNodes.filter(n => n.type === 'n8n-nodes-base.executeWorkflow');
  for (const nestedNode of nestedExecNodes) {
    const nestedTargetKey = nestedNode.parameters.workflowId.value;
    const nestedPrefix = makePrefix(`${nestedNode.id}_${uid()}`);
    const result = inlineCall(nestedTargetKey, nestedNode, depth + 1);

    // Splice nested result into subNodes/subConnections, replacing nestedNode.
    subNodes = subNodes.filter(n => n.id !== nestedNode.id);
    subNodes.push(...result.nodes);

    // Redirect anything in subConnections that pointed AT nestedNode.name to point at the
    // nested adapter's new name instead.
    for (const [srcName, portMap] of Object.entries(subConnections)) {
      for (const port of Object.keys(portMap)) {
        portMap[port] = portMap[port].map(connArr =>
          connArr.map(conn => conn.node === nestedNode.name ? { ...conn, node: result.adapterName } : conn)
        );
      }
    }
    // nestedNode's own outgoing entry (subConnections[nestedNode.name]) is LEFT AS-IS: the
    // nested subgraph's sink was renamed to nestedNode.name, so that key correctly continues
    // to describe "whatever comes after this call" -- just merge in the nested subgraph's own
    // internal connections alongside it.
    Object.assign(subConnections, result.connections);

    if (nestedNode.onError) {
      note(`  [note] ${targetKey}: nested call to ${nestedTargetKey} (node "${nestedNode.name}") had onError="${nestedNode.onError}" -- moved to nested adapter "${result.adapterName}".`);
    }
  }

  // Determine the entry connections (what the trigger fed) BEFORE renaming, for reference only
  // (not strictly needed since rename handles wiring automatically).

  // Build rename map for every node currently in subNodes (post nested-inlining).
  const prefix = makePrefix(`${targetKey}_${callSiteNode.id}_${uid()}`);
  const renameMap = {};
  for (const n of subNodes) {
    renameMap[n.name] = `${prefix}${n.name}`;
  }

  // Turn the trigger node into the adapter Code node. IMPORTANT: the adapter's jsCode is built
  // from the CALL-SITE's (outer/parent graph) workflowInputs expressions, which may themselves
  // reference a node also literally named "When Executed by Another Workflow" (the OUTER
  // sub-workflow's own trigger, since every sub-workflow's trigger uses that same generic
  // name). If we injected that code now and then ran this subgraph's OWN rewriteNodeNameRefs
  // pass over it, it would incorrectly rewrite the outer reference too (name collision). So we
  // stash it as a unique placeholder marker now, run this subgraph's internal rename pass, and
  // only substitute the real adapter code back in afterwards -- untouched by this pass.
  const adapterCode = buildAdapterCode(callSiteNode.parameters.workflowInputs && callSiteNode.parameters.workflowInputs.value);
  const adapterPlaceholder = `__ADAPTER_CODE_PLACEHOLDER_${uid()}__`;
  triggerNode.type = 'n8n-nodes-base.code';
  triggerNode.typeVersion = 2;
  triggerNode.parameters = { jsCode: adapterPlaceholder };
  if (callSiteNode.onError) {
    triggerNode.onError = callSiteNode.onError;
  }
  delete triggerNode.webhookId;

  // Apply id/name rename + position offset to every node.
  const idRenameMap = {};
  for (const n of subNodes) {
    const newName = renameMap[n.name];
    idRenameMap[n.id] = `${prefix}${n.id}`;
  }
  for (const n of subNodes) {
    n.name = renameMap[n.name];
    n.id = idRenameMap[n.id] || (`${prefix}${n.id}`);
  }

  // Rewrite connections object keys + targets using renameMap (node NAMES).
  const newConnections = {};
  for (const [srcName, portMap] of Object.entries(subConnections)) {
    const newSrcName = renameMap[srcName] || srcName;
    const newPortMap = {};
    for (const [port, connArrArr] of Object.entries(portMap)) {
      newPortMap[port] = connArrArr.map(connArr =>
        connArr.map(conn => ({ ...conn, node: renameMap[conn.node] || conn.node }))
      );
    }
    newConnections[newSrcName] = newPortMap;
  }
  subConnections = newConnections;

  // Rewrite $('OldName') expression references throughout the copied subgraph's node bodies.
  let blob = JSON.stringify(subNodes);
  blob = rewriteNodeNameRefs(blob, renameMap);
  subNodes = JSON.parse(blob);

  // Now substitute the real adapter code back in (see note above) -- it references the OUTER
  // graph's node names, which must NOT be touched by this subgraph's own rename pass.
  const triggerAfterRewrite = subNodes.find(n => n.parameters && n.parameters.jsCode === adapterPlaceholder);
  if (!triggerAfterRewrite) throw new Error(`${targetKey}: could not re-locate adapter node after rename pass`);
  triggerAfterRewrite.parameters.jsCode = adapterCode;

  // Position offset: place relative to the call-site node's position, offset down/right by
  // depth so nested copies don't overlap their parent copy, plus a small unique jitter so
  // multiple call-sites of the same sub-workflow don't stack exactly on top of each other.
  const anchor = callSiteNode.position || [0, 0];
  const triggerPos = subWfSrc.nodes.find(n => n.id === 'trigger') ? subWfSrc.nodes.find(n => n.id === 'trigger').position : [0, 0];
  const jitter = (uidCounter % 7) * 40;
  const baseX = anchor[0] - triggerPos[0] + 60;
  const baseY = anchor[1] + 260 + depth * 900 + jitter;
  for (const n of subNodes) {
    const orig = subWfSrc.nodes.find(o => `${prefix}${o.id}` === n.id);
    const origPos = orig ? orig.position : [0, 0];
    n.position = [baseX + origPos[0], baseY + origPos[1]];
  }

  // Determine sink node(s): no outgoing connection within this (already fully-inlined) subgraph.
  const sinks = findSinkNodes(subNodes, subConnections);
  if (sinks.length === 0) {
    throw new Error(`${targetKey}: no sink node found (call-site "${callSiteNode.name}")`);
  }
  if (sinks.length === 1) {
    // Simple case: rename the single terminal node to the call-site's display name so external
    // $('<call-site name>') references keep resolving without any downstream rewrite.
    const primarySink = sinks[0];
    const oldSinkName = primarySink.name;
    primarySink.name = callSiteNode.name;
    primarySink.id = `${prefix}sink_${callSiteNode.id}`;
    subConnections = renameNodeInConnections(subConnections, oldSinkName, callSiteNode.name);
  } else {
    // Multiple genuine terminal branches (e.g. an If/Switch inside the sub-workflow where only
    // one branch runs per execution, such as WF-04's cache-hit vs cache-miss paths). Fan them
    // all into a single NoOp passthrough node and give THAT node the call-site's display name,
    // so it acts as the one unified terminal output -- exactly like the real Execute Workflow
    // node's single output used to be.
    note(`  [note] ${targetKey}: ${sinks.length} terminal branches found for call-site "${callSiteNode.name}" (only one executes per run) -- fanned into a single unifying NoOp node named "${callSiteNode.name}".`);
    const maxX = Math.max(...sinks.map(s => s.position[0]));
    const avgY = sinks.reduce((s, n) => s + n.position[1], 0) / sinks.length;
    const unifyNode = {
      parameters: {},
      id: `${prefix}unify_${callSiteNode.id}`,
      name: callSiteNode.name,
      type: 'n8n-nodes-base.noOp',
      typeVersion: 1,
      position: [maxX + 260, avgY],
    };
    for (const sink of sinks) {
      subConnections[sink.name] = { main: [[{ node: unifyNode.name, type: 'main', index: 0 }]] };
    }
    subNodes.push(unifyNode);
  }

  const adapterName = renameMap[triggerNode.name] ? triggerNode.name : triggerNode.name; // already renamed above
  return {
    nodes: subNodes,
    connections: subConnections,
    adapterName: triggerNode.name, // triggerNode.name was already set via rename loop
    sinkNames: [callSiteNode.name],
  };
}

/**
 * Process a top-level (or independently-triggered) workflow's nodes/connections: find every
 * `executeWorkflow` node and replace it in-place with a fully inlined copy (recursively).
 * Mutates and returns { nodes, connections }.
 */
function expandWorkflow(nodes, connections, label) {
  nodes = JSON.parse(JSON.stringify(nodes));
  connections = JSON.parse(JSON.stringify(connections));

  const execNodes = nodes.filter(n => n.type === 'n8n-nodes-base.executeWorkflow');
  note(`${label}: found ${execNodes.length} Execute Workflow node(s) to inline.`);

  for (const execNode of execNodes) {
    const targetKey = execNode.parameters.workflowId.value;
    const result = inlineCall(targetKey, execNode, 0);

    nodes = nodes.filter(n => n.id !== execNode.id);
    nodes.push(...result.nodes);

    // Redirect connections that pointed AT execNode.name to point at the adapter's new name.
    for (const [srcName, portMap] of Object.entries(connections)) {
      for (const port of Object.keys(portMap)) {
        portMap[port] = portMap[port].map(connArr =>
          connArr.map(conn => conn.node === execNode.name ? { ...conn, node: result.adapterName } : conn)
        );
      }
    }
    // The execNode's own outgoing connections stay keyed under execNode.name, which the
    // primary sink was renamed to -- so no change needed there. Just merge in the subgraph's
    // internal connections (this does NOT include execNode.name's original outgoing edges,
    // which remain untouched in `connections`).
    Object.assign(connections, result.connections);

    if (execNode.onError) {
      note(`  [note] ${label}: "${execNode.name}" had onError="${execNode.onError}" -- moved to its inlined adapter node.`);
    }
  }

  return { nodes, connections };
}

/**
 * Prefix every node id/name in a whole top-level (already fully inlined) workflow graph, so
 * that its own original nodes (triggers, sticky notes, etc. -- which keep their original,
 * un-prefixed names from the source file) can't collide with same-named nodes from a different
 * merged branch (e.g. every source file has its own "Purpose" sticky note / "sticky_purpose" id).
 */
function prefixWholeWorkflow(nodes, connections, prefix) {
  const renameMap = {};
  for (const n of nodes) renameMap[n.name] = `${prefix}${n.name}`;
  for (const n of nodes) {
    n.id = `${prefix}${n.id}`;
    n.name = renameMap[n.name];
  }
  const newConnections = {};
  for (const [srcName, portMap] of Object.entries(connections)) {
    const newSrcName = renameMap[srcName] || srcName;
    const newPortMap = {};
    for (const [port, connArrArr] of Object.entries(portMap)) {
      newPortMap[port] = connArrArr.map(connArr => connArr.map(conn => ({ ...conn, node: renameMap[conn.node] || conn.node })));
    }
    newConnections[newSrcName] = newPortMap;
  }
  let blob = JSON.stringify(nodes);
  blob = rewriteNodeNameRefs(blob, renameMap);
  nodes = JSON.parse(blob);
  return { nodes, connections: newConnections };
}

// ---- Expand each of the 4 independently-triggered graphs ----
const wf01 = expandWorkflow(raw['WF-01_Chat_Orchestrator'].nodes, raw['WF-01_Chat_Orchestrator'].connections, 'WF-01 Chat Orchestrator');
let wf11 = expandWorkflow(raw['WF-11_Global_Error_Handler'].nodes, raw['WF-11_Global_Error_Handler'].connections, 'WF-11 Global Error Handler');
let wf12 = expandWorkflow(raw['WF-12_Maintenance'].nodes, raw['WF-12_Maintenance'].connections, 'WF-12 Maintenance');
let wf13 = expandWorkflow(raw['WF-13_PIN_Enrolment'].nodes, raw['WF-13_PIN_Enrolment'].connections, 'WF-13 PIN Enrolment');

// Prefix each independent branch's OWN top-level nodes (triggers, sticky notes, etc. that were
// never touched by expandWorkflow's inlining) so they can't collide with each other or with
// WF-01's own top-level nodes (e.g. every source file has its own "Purpose" sticky note).
wf11 = prefixWholeWorkflow(wf11.nodes, wf11.connections, 'wf11_');
wf12 = prefixWholeWorkflow(wf12.nodes, wf12.connections, 'wf12_');
wf13 = prefixWholeWorkflow(wf13.nodes, wf13.connections, 'wf13_');

// ---- Position offsets for the 3 side branches so they sit below/beside the main canvas ----
function bbox(nodes) {
  const xs = nodes.map(n => n.position[0]);
  const ys = nodes.map(n => n.position[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}
function shift(nodes, dx, dy) {
  for (const n of nodes) { n.position = [n.position[0] + dx, n.position[1] + dy]; }
}

const bb01 = bbox(wf01.nodes);
let cursorY = bb01.maxY + 1400;

for (const [branch, label] of [[wf11, 'WF-11 Global Error Handler'], [wf12, 'WF-12 Maintenance'], [wf13, 'WF-13 PIN Enrolment']]) {
  const bb = bbox(branch.nodes);
  shift(branch.nodes, bb01.minX - bb.minX, cursorY - bb.minY);
  cursorY += (bb.maxY - bb.minY) + 700;
}

// ---- Sticky-note section labels ----
function stickyNote(id, name, content, position, size) {
  return {
    parameters: { content, height: size[1], width: size[0] },
    id, name,
    type: 'n8n-nodes-base.stickyNote',
    typeVersion: 1,
    position,
  };
}

const sectionStickies = [
  stickyNote('section_main', 'Section: Chat Orchestrator', '## Main Flow\nWF-01 Chat Orchestrator, with WF-02..WF-10 fully inlined at every call-site (nested sub-calls, e.g. WF-10 inside WF-08/WF-09, are inlined too).', [bb01.minX - 60, bb01.minY - 700], [500, 160]),
  stickyNote('section_wf11', 'Section: Error Handler', '## Independent Branch\nWF-11 Global Error Handler (Error Trigger). Inlines its own Audit (WF-10) calls. Set as this workflow’s Error Workflow -- note: n8n cannot set a workflow as its own error workflow, so this branch stays disconnected on the canvas and must be referenced from Settings > Error Workflow on this same combined workflow (self-reference caveat, see README).', [bb01.minX - 60, cursorY - ((wf12.nodes.length ? 0 : 0))], [560, 200]),
];

// Re-derive positions for stickies precisely now that branches are shifted; simpler: place each
// sticky just above its branch's bbox.
function bboxOf(nodes) { return bbox(nodes); }
const bbE = bboxOf(wf11.nodes);
const bbM = bboxOf(wf12.nodes);
const bbP = bboxOf(wf13.nodes);

const stickies = [
  stickyNote('sticky_section_main', 'Section: Chat Orchestrator', '## Main Flow -- WF-01 Chat Orchestrator\nAll Execute Workflow calls (WF-02..WF-10) are inlined in place, including nested sub-calls (e.g. WF-10 Audit inlined again inside the inlined WF-08 Verify PIN / WF-09 Append Entry copies).', [bb01.minX - 40, bb01.minY - 260], [560, 160]),
  stickyNote('sticky_section_wf11', 'Section: Global Error Handler', '## WF-11 Global Error Handler (independent branch)\nOriginally an Error Trigger workflow referenced from every other workflow’s Settings > Error Workflow. n8n does not allow a workflow to name itself as its own Error Workflow, so after merging this branch cannot self-attach -- see README caveat.', [bbE.minX - 40, bbE.minY - 220], [560, 180]),
  stickyNote('sticky_section_wf12', 'Section: Maintenance', '## WF-12 Maintenance (independent branch)\nThree Schedule Trigger sub-branches (session expiry, cleanup, lockout resets). Inlined Execute Workflow calls, if any, are resolved in place.', [bbM.minX - 40, bbM.minY - 220], [520, 160]),
  stickyNote('sticky_section_wf13', 'Section: PIN Enrolment', '## WF-13 PIN Enrolment (independent branch)\nForm Trigger workflow for HR PIN setting/resetting. Its Audit (WF-10) call is inlined in place.', [bbP.minX - 40, bbP.minY - 220], [520, 160]),
];

// ---- Merge everything ----
const allNodes = [
  ...wf01.nodes,
  ...wf11.nodes,
  ...wf12.nodes,
  ...wf13.nodes,
  ...stickies,
];
const allConnections = Object.assign({}, wf01.connections, wf11.connections, wf12.connections, wf13.connections);

// WF-01's own settings pointed errorWorkflow at the old standalone "WF-11_Global_Error_Handler"
// workflow id. After merging, WF-11 is just an inlined branch of THIS SAME workflow, and n8n
// does not allow a workflow to name itself as its own Error Workflow -- so that reference would
// be dangling/invalid. Drop it rather than ship a broken pointer (see README caveat).
const mergedSettings = { ...(raw['WF-01_Chat_Orchestrator'].settings || { executionOrder: 'v1' }) };
delete mergedSettings.errorWorkflow;

const combined = {
  name: 'WorkLog AI Lite — Combined',
  id: 'WorkLog-Lite-Combined',
  nodes: allNodes,
  connections: allConnections,
  pinData: {},
  settings: mergedSettings,
  active: false,
};

// ---- Validation ----
const ids = combined.nodes.map(n => n.id);
const names = combined.nodes.map(n => n.name);
const dupIds = ids.filter((v, i) => ids.indexOf(v) !== i);
const dupNames = names.filter((v, i) => names.indexOf(v) !== i);
if (dupIds.length) throw new Error('Duplicate node ids: ' + [...new Set(dupIds)].join(', '));
if (dupNames.length) throw new Error('Duplicate node names: ' + [...new Set(dupNames)].join(', '));

const nameSet = new Set(names);
const missing = [];
for (const [src, portMap] of Object.entries(combined.connections)) {
  if (!nameSet.has(src)) missing.push(`source "${src}"`);
  for (const connArrArr of Object.values(portMap)) {
    for (const connArr of connArrArr) {
      for (const conn of connArr) {
        if (!nameSet.has(conn.node)) missing.push(`target "${conn.node}" (from "${src}")`);
      }
    }
  }
}
if (missing.length) throw new Error('Connections reference missing nodes:\n' + missing.join('\n'));

const leftoverExec = combined.nodes.filter(n => n.type === 'n8n-nodes-base.executeWorkflow');
if (leftoverExec.length) throw new Error('Leftover executeWorkflow nodes: ' + leftoverExec.map(n => n.name).join(', '));

note(`\nOK: ${combined.nodes.length} nodes, ${Object.keys(combined.connections).length} connection sources, no duplicate ids/names, no dangling connections, no leftover executeWorkflow nodes.`);

fs.writeFileSync(OUT_FILE, JSON.stringify(combined, null, 2));
note(`Wrote ${OUT_FILE}`);
