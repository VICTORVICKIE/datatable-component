'use client';

import { db } from '@/lib/firebase';
import { explorerPlugin } from '@graphiql/plugin-explorer';
import '@graphiql/plugin-explorer/style.css';
import { ToolbarButton, useGraphiQL, useGraphiQLActions } from '@graphiql/react';
import '@graphiql/react/style.css';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { parse, print, getOperationAST } from 'graphql';
import 'graphiql/graphiql.css';
import 'graphiql/setup-workers/webpack';
import 'graphiql/style.css';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tree } from 'primereact/tree';
import React, { useEffect, useMemo, useState, useRef } from 'react';


const editorToolsStyles = `
  .graphiql-container .graphiql-editor-tools,
  .graphiql-container .graphiql-toggle-editor-tools {
    display: none !important;
  }
  
  /* Tree scrollable container styles - make only tree content scrollable */
  .tree-scrollable-wrapper {
    height: 400px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .tree-scrollable-wrapper .p-tree {
    height: 100%;
    display: flex;
    flex-direction: column;
    border: none;
  }
  
  .tree-scrollable-wrapper .p-tree-filter-container {
    flex-shrink: 0;
    padding: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #d1d5db;
    background-color: white;
  }
  
  .tree-scrollable-wrapper .p-tree-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1rem;
  }
  
  /* Smooth expansion animation */
  .p-tree .p-treenode-content {
    transition: background-color 0.15s ease;
  }
  
  .p-tree .p-treenode-children {
    transition: opacity 0.15s ease-in-out;
    padding-left: 1.5rem;
    margin-left: 0;
  }
  
  /* Ensure tree toggle icon rotates smoothly */
  .p-tree .p-tree-toggler {
    transition: transform 0.2s ease-in-out;
  }
  
  /* Increase indentation for nested tree nodes */
  .p-tree ul {
    padding-left: 1.5rem;
  }
  
  .p-tree .p-treenode {
    position: relative;
  }
  
  /* Checkbox outline styling */
  .p-checkbox {
    border: 1px solid #d1d5db;
    border-radius: 4px;
  }
  
  .p-checkbox:not(.p-disabled):hover {
    border-color: #9ca3af;
  }
  
  .p-checkbox.p-highlight {
    border-color: #3b82f6;
  }
  
  /* Custom history plugin styles */
  .graphiql-history-plugin {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--color-neutral-5, #ffffff);
  }
  
  .graphiql-history-plugin-header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-neutral-15, #e5e7eb);
    font-weight: 600;
    font-size: 13px;
    color: var(--color-neutral-80, #1f2937);
    background: var(--color-neutral-5, #ffffff);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .graphiql-history-plugin-header-count {
    font-weight: 400;
    font-size: 11px;
    color: var(--color-neutral-50, #6b7280);
    margin-left: 8px;
  }
  
  .graphiql-history-plugin-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px;
  }
  
  .graphiql-history-item {
    padding: 10px 12px;
    margin: 2px 4px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 12px;
    border: 1px solid transparent;
    background: var(--color-neutral-5, #ffffff);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    min-height: 48px;
  }
  
  .graphiql-history-item:hover {
    background-color: var(--color-neutral-10, #f9fafb);
    border-color: var(--color-neutral-20, #e5e7eb);
  }
  
  .graphiql-history-item.selected {
    background-color: #3b82f6 !important;
    border-color: #3b82f6 !important;
    color: #ffffff !important;
  }
  
  .graphiql-history-item.selected:hover {
    background-color: #2563eb !important;
    border-color: #2563eb !important;
  }
  
  .graphiql-history-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 20px;
    line-height: 1.4;
  }
  
  .graphiql-history-item-name {
    font-weight: 500;
    color: var(--color-neutral-80, #1f2937);
    line-height: 1.4;
    word-break: break-word;
    flex: 1;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
  }
  
  .graphiql-history-item.selected .graphiql-history-item-name {
    color: #ffffff !important;
    font-weight: 600;
  }
  
  
  .graphiql-history-item-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    line-height: 1.4;
  }
  
  .graphiql-history-item.selected .graphiql-history-item-meta {
    color: rgba(255, 255, 255, 0.95) !important;
  }
  
  .graphiql-history-item-badge {
    padding: 1px 5px;
    border-radius: 2px;
    background: var(--color-neutral-15, #e5e7eb);
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    line-height: 1.4;
    white-space: nowrap;
    color: var(--color-neutral-70, #374151);
  }
  
  .graphiql-history-item.selected .graphiql-history-item-badge {
    background: rgba(255, 255, 255, 0.3) !important;
    color: #ffffff !important;
  }
  
  .graphiql-history-empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--color-neutral-50, #6b7280);
    font-size: 12px;
    line-height: 1.5;
  }
  
  .graphiql-history-loading {
    padding: 24px 16px;
    text-align: center;
    color: var(--color-neutral-50, #6b7280);
    font-size: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  
  .graphiql-history-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--color-neutral-20, #e5e7eb);
    border-top-color: var(--color-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Responsive adjustments */
  @media (max-width: 768px) {
    .graphiql-history-plugin-header {
      padding: 10px 12px;
      font-size: 12px;
    }
    
    .graphiql-history-item {
      padding: 8px 10px;
      margin: 2px;
    }
    
    .graphiql-history-item-name {
      font-size: 11px;
    }
  }
`;


const ToolbarPlaceholder = ({ children }) => children;

// Custom History Plugin Icon Component
function HistoryIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M10 2C5.58 2 2 5.58 2 10C2 14.42 5.58 18 10 18C14.42 18 18 14.42 18 10C18 5.58 14.42 2 10 2ZM10 16C6.69 16 4 13.31 4 10C4 6.69 6.69 4 10 4C13.31 4 16 6.69 16 10C16 13.31 13.31 16 10 16ZM10.5 6H9V11L13.25 13.15L13.8 12.1L10.5 10.25V6Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Custom History Plugin Content Component
function HistoryPluginContent() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueryId, setSelectedQueryId] = useState(null);
  const { addTab, updateActiveTabValues } = useGraphiQLActions();
  const queryEditor = useGraphiQL((state) => state.queryEditor);
  const currentQuery = useGraphiQL((state) => state.queryEditor?.getValue() || '');

  useEffect(() => {
    const loadQueries = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'gql'));
        const queriesList = [];
        querySnapshot.forEach((doc) => {
          const body = doc.data().body || '';
          // Only include queries that have a body
          if (body.trim()) {
            queriesList.push({
              id: doc.id,
              name: doc.id,
              body: body,
              index: doc.data().index || '',
              clientSave: doc.data().clientSave || false,
            });
          }
        });
        // Sort by name
        queriesList.sort((a, b) => a.name.localeCompare(b.name));
        setQueries(queriesList);
      } catch (error) {
        console.error('Error loading queries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQueries();
  }, []);

  // Update selected query when current query changes
  useEffect(() => {
    if (currentQuery && queries.length > 0) {
      const normalizedCurrent = currentQuery.trim().replace(/\s+/g, ' ');
      const matchingQuery = queries.find(q => {
        if (!q.body || !q.body.trim()) return false;
        const normalizedSaved = q.body.trim().replace(/\s+/g, ' ');
        return normalizedCurrent === normalizedSaved || normalizedCurrent.includes(normalizedSaved.substring(0, 50));
      });
      if (matchingQuery) {
        setSelectedQueryId(matchingQuery.id);
      } else {
        setSelectedQueryId(null);
      }
    } else {
      setSelectedQueryId(null);
    }
  }, [currentQuery, queries]);

  const handleQueryClick = (query, event) => {
    if (!query.body || !query.body.trim()) return;
    
    // Always open in new tab
    addTab();
    // The new tab will be created and become active
    // Use updateActiveTabValues to set the query in the new tab
    setTimeout(() => {
      updateActiveTabValues({ query: query.body });
      // Also update the editor if it exists
      if (queryEditor) {
        queryEditor.setValue(query.body);
      }
    }, 10);
  };

  const getQueryType = (queryBody) => {
    if (!queryBody) return null;
    const trimmed = queryBody.trim();
    if (trimmed.startsWith('query')) return 'Query';
    if (trimmed.startsWith('mutation')) return 'Mutation';
    if (trimmed.startsWith('subscription')) return 'Subscription';
    return 'Query';
  };

  return (
    <div className="graphiql-history-plugin">
      <div className="graphiql-history-plugin-header">
        <span>Saved Queries</span>
        {queries.length > 0 && (
          <span className="graphiql-history-plugin-header-count">({queries.length})</span>
        )}
      </div>
      <div className="graphiql-history-plugin-content">
        {loading ? (
          <div className="graphiql-history-loading">
            <div className="graphiql-history-loading-spinner"></div>
            <div>Loading queries...</div>
          </div>
        ) : queries.length === 0 ? (
          <div className="graphiql-history-empty">
            <div>No saved queries found</div>
            <div style={{ fontSize: '10px', marginTop: '6px', opacity: 0.7 }}>
              Save queries using the Save button
            </div>
          </div>
        ) : (
          queries.map((query) => {
            const isSelected = selectedQueryId === query.id;
            const queryType = getQueryType(query.body);
            return (
              <div
                key={query.id}
                className={`graphiql-history-item ${isSelected ? 'selected' : ''}`}
                onClick={(e) => handleQueryClick(query, e)}
                title={query.body ? `Click to open in new tab: ${query.body.substring(0, 150)}` : ''}
              >
                <div className="graphiql-history-item-header">
                  <div className="graphiql-history-item-name">{query.name}</div>
                  <div className="graphiql-history-item-meta">
                    {queryType && (
                      <span className="graphiql-history-item-badge">{queryType}</span>
                    )}
                    {query.clientSave && (
                      <span className="graphiql-history-item-badge">Client</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Create custom history plugin
function createHistoryPlugin() {
  return {
    title: 'Query History',
    icon: HistoryIcon,
    content: () => <HistoryPluginContent />,
  };
}


function GraphiQLWrapper({ children, ...props }) {
  const [GraphiQLModule, setGraphiQLModule] = useState(null);

  useEffect(() => {
    import('graphiql').then((mod) => {
      setGraphiQLModule(mod);
    });
  }, []);

  if (!GraphiQLModule) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading GraphQL Playground...</div>
      </div>
    );
  }

  const GraphiQL = GraphiQLModule.GraphiQL;
  const Toolbar = GraphiQL.Toolbar;


  const processedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === ToolbarPlaceholder) {
      return React.createElement(Toolbar, child.props);
    }
    return child;
  });

  return <GraphiQL {...props}>{processedChildren}</GraphiQL>;
}


const parseQueryToTreeNodes = (queryString, parentPath = '') => {
  if (!queryString || !queryString.trim()) {
    return [];
  }

  try {
    const ast = parse(queryString);
    const treeNodes = [];


    const operation = ast.definitions.find(
      def => def.kind === 'OperationDefinition'
    );

    if (!operation || !operation.selectionSet) {
      return [];
    }

    // Helper to serialize GraphQL values recursively
    const serializeValue = (value) => {
      if (value.kind === 'StringValue') return `"${value.value}"`;
      if (value.kind === 'IntValue') return value.value;
      if (value.kind === 'BooleanValue') return value.value;
      if (value.kind === 'FloatValue') return value.value;
      if (value.kind === 'NullValue') return 'null';
      if (value.kind === 'EnumValue') return value.value;
      if (value.kind === 'ListValue') {
        return `[${value.values.map(v => serializeValue(v)).join(', ')}]`;
      }
      if (value.kind === 'ObjectValue') {
        return `{${value.fields.map(f => `${f.name.value}: ${serializeValue(f.value)}`).join(', ')}}`;
      }
      if (value.kind === 'Variable') {
        return `$${value.name.value}`;
      }
      return value.value || '';
    };

    // Helper to serialize arguments
    const serializeArguments = (args) => {
      if (!args || args.length === 0) return '';

      const argStrings = args.map(arg => {
        const name = arg.name.value;
        const value = serializeValue(arg.value);
        return `${name}: ${value}`;
      });

      return `(${argStrings.join(', ')})`;
    };

    const processSelections = (selections, currentPath = '', originalPath = '') => {
      const result = [];

      for (const selection of selections) {
        if (selection.kind !== 'Field') continue;

        const fieldName = selection.alias?.value || selection.name.value;
        const originalFieldName = selection.name.value;
        const hasAlias = !!selection.alias;
        const hasChildren = selection.selectionSet &&
          selection.selectionSet.selections &&
          selection.selectionSet.selections.length > 0;

        // Serialize arguments
        const argsString = serializeArguments(selection.arguments);

        const actualPath = originalPath ? `${originalPath}.${fieldName}` : fieldName;
        const displayPath = currentPath ? `${currentPath}.${fieldName}` : fieldName;

        // Process children normally - no flattening of structural wrappers
        let children = null;

        if (hasChildren) {
          children = processSelections(
            selection.selectionSet.selections,
            displayPath,
            actualPath
          );
        }

        // Create searchable label text for filtering
        const labelText = hasAlias
          ? `${fieldName} (alias: ${originalFieldName})${argsString ? ' ' + argsString : ''}`
          : `${fieldName}${argsString ? ' ' + argsString : ''}`;

        const node = {
          key: displayPath,
          label: (
            <div className="flex items-center gap-2">
              <span className="font-medium">{fieldName}</span>
              {hasAlias && (
                <span className="text-xs text-gray-400">(alias: {originalFieldName})</span>
              )}
              {argsString && (
                <span className="text-xs text-gray-500 font-mono">{argsString}</span>
              )}
            </div>
          ),
          data: {
            name: fieldName,
            originalName: originalFieldName,
            alias: hasAlias ? originalFieldName : null,
            arguments: argsString,
            selection: selection, // Store original selection for query building
            index: result.length,
            path: displayPath,
            actualPath: actualPath,
            labelText: labelText, // Add searchable text for filtering
          },
          leaf: !children || children.length === 0,
        };

        if (children && children.length > 0) {
          node.children = children;
        }

        result.push(node);
      }

      return result;
    };

    return processSelections(operation.selectionSet.selections, parentPath);
  } catch (error) {
    console.error('Error parsing query:', error);
    return [];
  }
};


const buildQueryFromSelection = (nodes, schema, selectedKeys, indent = 0) => {
  if (!nodes || nodes.length === 0) return '';

  const indentStr = '  '.repeat(indent);
  let queryParts = [];

  nodes.forEach((node) => {
    if (selectedKeys[node.key]) {
      const fieldName = node.data.name;


      let selectedChildren = [];
      if (node.children && node.children.length > 0) {
        const nestedQuery = buildQueryFromSelection(
          node.children,
          schema,
          selectedKeys,
          indent + 1
        );
        if (nestedQuery.trim()) {
          selectedChildren.push(nestedQuery);
        }
      }

      if (selectedChildren.length > 0) {

        queryParts.push(`${indentStr}${fieldName} {\n${selectedChildren.join('\n')}\n${indentStr}}`);
      } else {

        queryParts.push(`${indentStr}${fieldName}`);
      }
    }
  });

  return queryParts.join('\n');
};


const findNodeByKey = (nodes, key) => {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.children) {
      const found = findNodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return null;
};

function SaveModal({ isOpen, onClose }) {
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [clientSave, setClientSave] = useState(false);
  const [treeNodes, setTreeNodes] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [saving, setSaving] = useState(false);
  const queryEditor = useGraphiQL((state) => state.queryEditor);
  const activeButtonRef = useRef(null);

  // Save the active button reference before dialog opens
  useEffect(() => {
    if (isOpen) {
      const sidebar = document.querySelector('.graphiql-sidebar');
      if (sidebar) {
        const activeButton = sidebar.querySelector('button.active');
        if (activeButton) {
          activeButtonRef.current = activeButton;
        }
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      if (activeButtonRef.current) {
        activeButtonRef.current.click();
        activeButtonRef.current.click();
        activeButtonRef.current = null;
      }
    }, 0);
  };


  // Extract operation name from query
  const extractOperationName = (queryString) => {
    if (!queryString || !queryString.trim()) return '';
    try {
      const ast = parse(queryString);
      const operation = getOperationAST(ast);
      return operation?.name?.value || '';
    } catch (error) {
      return '';
    }
  };

  useEffect(() => {
    if (isOpen && queryEditor) {
      try {
        const queryString = queryEditor.getValue() || '';
        const nodes = parseQueryToTreeNodes(queryString);
        setTreeNodes(nodes);
        
        // Extract operation name and set as default name
        const operationName = extractOperationName(queryString);
        if (operationName) {
          setName(operationName);
          setOriginalName(operationName);
        } else {
          setName('');
          setOriginalName('');
        }
      } catch (error) {
        console.error('Error parsing query to tree:', error);
        setTreeNodes([]);
        setName('');
        setOriginalName('');
      }
    }
  }, [isOpen, queryEditor]);


  const handleToggle = (event) => {
    setExpandedKeys(event.value);
  };


  useEffect(() => {
    if (!isOpen) {
      setName('');
      setOriginalName('');
      setClientSave(false);
      setSelectedKeys(null);
      setExpandedKeys({});
      setTreeNodes([]);
      setSaving(false);
    }
  }, [isOpen]);


  const handleNodeSelect = (e) => {
    setSelectedKeys(e.value);
  };


  const getSelectedFieldName = () => {
    if (!selectedKeys) return null;


    const selectedKey = selectedKeys;
    const node = findNodeByKey(treeNodes, selectedKey);


    if (node) {

      const topLevelKey = selectedKey.split('.')[0];
      const topLevelNode = findNodeByKey(treeNodes, topLevelKey);
      return topLevelNode?.data?.name || node?.data?.name || null;
    }
    return null;
  };

  const selectedFieldName = getSelectedFieldName();


  const getSelectedPath = () => {
    if (!selectedKeys) return null;

    const selectedKey = selectedKeys;
    const parts = selectedKey.split('.');
    const pathNames = [];

    for (let i = 0; i < parts.length; i++) {
      const currentKey = parts.slice(0, i + 1).join('.');
      const node = findNodeByKey(treeNodes, currentKey);
      if (node?.data?.name) {
        pathNames.push(node.data.name);
      }
    }

    return pathNames.length > 0 ? pathNames.join(' > ') : null;
  };

  const selectedPath = getSelectedPath();


  const buildSelectedQuery = () => {
    if (treeNodes.length === 0 || !selectedKeys) return '';

    const selectedNode = findNodeByKey(treeNodes, selectedKeys);
    if (!selectedNode) return '';

    // Get the top-level field
    const topLevelKey = selectedKeys.split('.')[0];
    const topLevelNode = findNodeByKey(treeNodes, topLevelKey);
    if (!topLevelNode) return '';

    // Build the path from top-level to selected field
    const parts = selectedKeys.split('.');
    let currentNodes = treeNodes;
    const pathNodes = [];

    // Collect all nodes in the path
    for (let i = 0; i < parts.length; i++) {
      const currentKey = parts.slice(0, i + 1).join('.');
      const node = findNodeByKey(currentNodes, currentKey);
      if (node) {
        pathNodes.push(node);
        if (node.children) {
          currentNodes = node.children;
        }
      }
    }

    // Helper to create a field selection AST node
    const createFieldSelection = (node, childSelections = null) => {
      const originalSelection = node.data.selection;

      if (originalSelection) {
        // Clone the original selection, preserving alias and arguments
        // Only include selectionSet if we have childSelections to add
        const field = {
          kind: 'Field',
          name: originalSelection.name,
          ...(originalSelection.alias && { alias: originalSelection.alias }),
          ...(originalSelection.arguments && originalSelection.arguments.length > 0 && {
            arguments: originalSelection.arguments
          }),
          // Only add selectionSet if we have child selections to include
          ...(childSelections && childSelections.length > 0 ? {
            selectionSet: {
              kind: 'SelectionSet',
              selections: childSelections
            }
          } : {})
        };
        return field;
      }

      // Fallback: create a basic field selection
      return {
        kind: 'Field',
        name: { kind: 'Name', value: node.data.originalName || node.data.name },
        ...(node.data.alias && {
          alias: { kind: 'Name', value: node.data.name }
        }),
        ...(childSelections && childSelections.length > 0 ? {
          selectionSet: {
            kind: 'SelectionSet',
            selections: childSelections
          }
        } : {})
      };
    };

    // Build the selection tree from bottom up, properly handling actualPath
    const buildSelectionTree = (nodes, currentIndex) => {
      if (currentIndex < 0) return null;

      const node = nodes[currentIndex];
      const isLast = currentIndex === nodes.length - 1;
      const isFirst = currentIndex === 0;

      // Build child selections first (for nested fields)
      let childSelections = null;
      if (!isFirst) {
        childSelections = buildSelectionTree(nodes, currentIndex - 1);
      }

      // If this is the last node (the selected field), it's just a simple field
      if (isLast) {
        return {
          kind: 'Field',
          name: { kind: 'Name', value: node.data.name }
        };
      }

      // For nodes with children, we need to check if the child has wrappers
      // Get the child node (if exists) to check its relative path
      let currentSelections = childSelections ? [childSelections] : [];

      if (childSelections && currentIndex > 0) {
        // Get the child node to check its actualPath
        const childNode = nodes[currentIndex - 1];
        const childActualPath = childNode.data.actualPath || childNode.data.name;
        const childActualParts = childActualPath.split('.');

        // Get this node's actual path
        const nodeActualPath = node.data.actualPath || node.data.name;
        const nodeActualParts = nodeActualPath.split('.');

        // Find what parts are between this node and the child (the relative path)
        // This tells us if we need edges/node wrappers
        const relativeParts = childActualParts.slice(nodeActualParts.length);

        // If there are intermediate wrappers (edges, node), wrap the child selection
        // relativeParts[0] to relativeParts[length-2] are wrappers
        // relativeParts[length-1] is the child field name itself
        if (relativeParts.length > 1) {
          // Wrap currentSelections with the wrapper fields, going from innermost to outermost
          for (let i = relativeParts.length - 2; i >= 0; i--) {
            const wrapperName = relativeParts[i];
            currentSelections = [{
              kind: 'Field',
              name: { kind: 'Name', value: wrapperName },
              selectionSet: {
                kind: 'SelectionSet',
                selections: currentSelections
              }
            }];
          }
        }
      }

      // Now create the field selection for this node
      // This uses the node's display name (which might be an alias) and includes arguments
      const fieldSelection = createFieldSelection(node, currentSelections.length > 0 ? currentSelections : null);

      return fieldSelection;
    };

    // Build the top-level selection
    let topLevelSelection;
    if (pathNodes.length === 1) {
      topLevelSelection = createFieldSelection(topLevelNode, null);
    } else {
      let childSelection = buildSelectionTree(pathNodes, pathNodes.length - 1);

      // Check if the child needs wrapping with edges/node structure
      if (childSelection && pathNodes.length > 1) {
        const childNode = pathNodes[pathNodes.length - 1];
        const childActualPath = childNode.data.actualPath || childNode.data.name;
        const childActualParts = childActualPath.split('.');

        const topLevelActualPath = topLevelNode.data.actualPath || topLevelNode.data.name;
        const topLevelActualParts = topLevelActualPath.split('.');

        // Find what parts are between top-level and child (the relative path)
        const relativeParts = childActualParts.slice(topLevelActualParts.length);

        // If there are intermediate wrappers (edges, node), wrap the child selection
        if (relativeParts.length > 1) {
          let wrappedSelection = childSelection;
          // Wrap from innermost to outermost
          for (let i = relativeParts.length - 2; i >= 0; i--) {
            const wrapperName = relativeParts[i];
            wrappedSelection = {
              kind: 'Field',
              name: { kind: 'Name', value: wrapperName },
              selectionSet: {
                kind: 'SelectionSet',
                selections: [wrappedSelection]
              }
            };
          }
          childSelection = wrappedSelection;
        }
      }

      topLevelSelection = createFieldSelection(topLevelNode, childSelection ? [childSelection] : null);
    }

    // Create operation definition
    const operation = {
      kind: 'OperationDefinition',
      operation: 'query',
      selectionSet: {
        kind: 'SelectionSet',
        selections: [topLevelSelection]
      }
    };

    // Create document
    const document = {
      kind: 'Document',
      definitions: [operation]
    };

    // Use print to convert AST to string
    try {
      return print(document);
    } catch (error) {
      console.error('Error printing query:', error);
      // Fallback: return a simple query
      return `query {\n  ${topLevelNode.data.name}\n}`;
    }
  };

  const selectedQuery = buildSelectedQuery();

  const handleIntegrate = async () => {
    if (name && selectedQuery && selectedFieldName) {
      setSaving(true);

      const currentQuery = queryEditor?.getValue() || '';
      try {
        // Update the query with the new operation name if it changed
        let queryToSave = currentQuery;
        if (originalName && originalName !== name && originalName.trim() && queryToSave) {
          try {
            const ast = parse(queryToSave);
            const operation = getOperationAST(ast);
            if (operation && operation.name) {
              // Replace the operation name in the query
              operation.name.value = name;
              queryToSave = print(ast);
              // Update the editor with the new query
              if (queryEditor) {
                queryEditor.setValue(queryToSave);
              }
            }
          } catch (error) {
            console.error('Error updating operation name:', error);
            // Continue with original query if update fails
          }
        }

        // Save the new document (or update existing one with same name)
        const docRef = doc(db, 'gql', name);
        await setDoc(docRef, {
          body: queryToSave || '',
          clientSave: clientSave,
          index: selectedQuery || '',
        });
      } catch (error) {
        console.error('Error saving query:', error);
        setSaving(false);
        return;
      }

      setName('');
      setOriginalName('');
      setClientSave(false);
      setSelectedKeys(null);
      setSaving(false);
      handleClose();
    }
  };

  const footerContent = (
    <div className="flex p-4 items-center justify-end gap-3">
      <Button
        label="Cancel"
        onClick={handleClose}
        severity="danger"
        outlined
      />
      <Button
        label={saving ? "Saving..." : "Save Query"}
        onClick={handleIntegrate}
        disabled={!name || !selectedQuery || !selectedFieldName || !selectedKeys || saving}
        severity="info"
        loading={saving}
      />
    </div>
  );

  return (
    <Dialog
      visible={isOpen}
      onHide={() => { if (!isOpen) return; handleClose(); }}
      header="Save GraphQL Field"
      footer={footerContent}
      style={{ width: '70vw' }}
      contentStyle={{ padding: '1rem' }}
      headerStyle={{ padding: '1rem' }}
      breakpoints={{ '960px': '90vw', '640px': '95vw' }}
      modal
      dismissableMask
    >
      <div className="flex flex-col gap-5">
        <div>
          <label htmlFor="field-name" className="block text-sm font-semibold text-gray-700 mb-2">
            Query Name
          </label>
          <InputText
            id="field-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name for this field"
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            inputId="client-save"
            checked={clientSave}
            onChange={(e) => setClientSave(e.checked)}
            className="border border-gray-300 rounded"
          />
          <label htmlFor="client-save" className="text-sm font-medium text-gray-700 cursor-pointer">
            Save to Client
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700">
              Select Index Field
            </label>
            {selectedPath && (
              <div className="mt-1 text-sm text-gray-600 font-mono">
                {selectedPath}
              </div>
            )}
          </div>
          {treeNodes.length > 0 ? (
            <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden tree-scrollable-wrapper">
              <Tree
                value={treeNodes}
                selectionMode="single"
                selectionKeys={selectedKeys}
                onSelectionChange={handleNodeSelect}
                expandedKeys={expandedKeys}
                onToggle={handleToggle}
                filter
                filterMode="lenient"
                filterBy="data.labelText,data.name"
                filterPlaceholder="Search fields..."
                className="w-full"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500 bg-gray-50 border border-gray-300 rounded-lg" style={{ height: '400px' }}>
              {queryEditor?.getValue()?.trim()
                ? 'No fields found in query. Please write a valid GraphQL query in the editor.'
                : 'Please write a GraphQL query in the editor to see the field tree.'}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}


export default function GraphQLPlayground() {
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);



  useEffect(() => {
    if (typeof window !== 'undefined' && typeof self !== 'undefined') {


      if (!self.MonacoEnvironment || !self.MonacoEnvironment.getWorker) {

        self.MonacoEnvironment = {
          getWorker: function (_workerId, label) {

            const baseUrl = process.env.NEXT_PUBLIC_MONACO_EDITOR_CDN_URL || 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min';
            const workerUrl = label === 'json'
              ? `${baseUrl}/language/json/json.worker.js`
              : `${baseUrl}/editor/editor.worker.js`;


            const blob = new Blob(
              [`importScripts('${workerUrl}');`],
              { type: 'application/javascript' }
            );
            return new Worker(URL.createObjectURL(blob));
          },
        };
      }
    }
  }, []);


  const explorer = useMemo(() => explorerPlugin(), []);
  const historyPlugin = useMemo(() => {
    const plugin = createHistoryPlugin();
    console.log('History plugin created:', plugin);
    return plugin;
  }, []);


  const fetcher = async (graphQLParams) => {
    const data = await fetch(
      process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || '',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN || '',
        },
        body: JSON.stringify(graphQLParams),
      }
    );
    return data.json().catch(() => data.text());
  };


  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      <style dangerouslySetInnerHTML={{ __html: editorToolsStyles }} />
      <header className="bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="max-w-full mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                GraphQL Playground
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                GraphiQL with Explorer plugin
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden graphiql-container">
        <GraphiQLWrapper
          fetcher={fetcher}
          plugins={[explorer, historyPlugin]}
          defaultEditorToolsVisibility={false}
          isHeadersEditorEnabled={false}
          initialVariables={null}
          initialHeaders={null}
        >
          <ToolbarPlaceholder>
            {({ prettify, copy, merge }) => (
              <>
                {prettify}
                {merge}
                {copy}
                <ToolbarButton
                  label="Save"
                  onClick={() => {
                    setIsFieldModalOpen(true);
                  }}
                >
                  <i className="pi pi-save graphiql-toolbar-icon mt-1 text-center text-lg" aria-hidden="true" />
                </ToolbarButton>
              </>
            )}
          </ToolbarPlaceholder>
          <SaveModal
            isOpen={isFieldModalOpen}
            onClose={() => setIsFieldModalOpen(false)}
          />
        </GraphiQLWrapper>
      </div>
    </div>
  );
}

