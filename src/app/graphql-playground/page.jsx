'use client';

import { db } from '@/lib/firebase';
import { explorerPlugin } from '@graphiql/plugin-explorer';
import '@graphiql/plugin-explorer/style.css';
import { ToolbarButton, useGraphiQL } from '@graphiql/react';
import '@graphiql/react/style.css';
import { doc, setDoc } from 'firebase/firestore';
import 'graphiql/graphiql.css';
import 'graphiql/setup-workers/webpack';
import 'graphiql/style.css';
import Link from 'next/link';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tree } from 'primereact/tree';
import React, { useEffect, useMemo, useState } from 'react';


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
`;


const ToolbarPlaceholder = ({ children }) => children;


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


const getBaseType = (type) => {
  if (type.ofType) {
    return getBaseType(type.ofType);
  }
  return type;
};


const hasNestedFields = (type, schema) => {
  const baseType = getBaseType(type);
  if (!baseType || !baseType.name) return false;

  const namedType = schema.getType(baseType.name);
  return namedType &&
    (namedType.getFields && typeof namedType.getFields === 'function') &&
    Object.keys(namedType.getFields()).length > 0;
};


const schemaToTreeNodes = (fields, schema, parentPath = '') => {
  return Object.keys(fields).map((fieldName, index) => {
    const field = fields[fieldName];
    const fieldType = field.type;
    const baseType = getBaseType(fieldType);
    const key = parentPath ? `${parentPath}.${fieldName}` : fieldName;


    const hasChildren = hasNestedFields(fieldType, schema);

    return {
      key,
      label: (
        <div className="flex items-center gap-2">
          <span className="font-medium">{fieldName}</span>
          <span className="text-xs text-gray-500">({fieldType.toString()})</span>
        </div>
      ),
      data: {
        name: fieldName,
        type: fieldType.toString(),
        baseTypeName: baseType?.name,
        description: field.description || '',
        index,
        path: key,
      },
      leaf: !hasChildren,
    };
  });
};


const loadNodeChildren = (node, schema) => {
  if (!node.data?.baseTypeName || !schema) return [];

  try {
    const namedType = schema.getType(node.data.baseTypeName);
    if (namedType && namedType.getFields) {
      const nestedFields = namedType.getFields();
      return schemaToTreeNodes(nestedFields, schema, node.key);
    }
  } catch (error) {
    console.error('Error loading node children:', error);
  }

  return [];
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
  const [clientSave, setClientSave] = useState(false);
  const [treeNodes, setTreeNodes] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(null);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [loadingNodes, setLoadingNodes] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const schema = useGraphiQL((state) => state.schema);
  const queryEditor = useGraphiQL((state) => state.queryEditor);


  useEffect(() => {
    if (isOpen && schema && schema.getQueryType) {
      try {
        const queryType = schema.getQueryType();
        if (queryType) {
          const fieldMap = queryType.getFields();


          setTreeNodes(prevNodes => {
            if (prevNodes.length === 0) {

              return schemaToTreeNodes(fieldMap, schema, '');
            }
            return prevNodes;
          });
        }
      } catch (error) {
        console.error('Error extracting schema fields:', error);
        setTreeNodes([]);
      }
    }
  }, [isOpen, schema]);


  const handleToggle = (event) => {
    setExpandedKeys(event.value);
  };


  const handleNodeExpand = async (event) => {

    if (!event.node.children && !event.node.leaf) {
      const nodeKey = event.node.key;


      setLoadingNodes(prev => new Set(prev).add(nodeKey));


      await new Promise(resolve => requestAnimationFrame(resolve));

      try {

        const children = loadNodeChildren(event.node, schema);


        const updateNode = (nodes, targetKey) => {
          return nodes.map((node) => {
            if (node.key === targetKey) {
              return {
                ...node,
                children: children,
              };
            }
            if (node.children) {
              return {
                ...node,
                children: updateNode(node.children, targetKey),
              };
            }
            return node;
          });
        };

        setTreeNodes(prevNodes => updateNode(prevNodes, nodeKey));
      } catch (error) {
        console.error('Error loading node children:', error);
      } finally {

        setLoadingNodes(prev => {
          const next = new Set(prev);
          next.delete(nodeKey);
          return next;
        });
      }
    }
  };


  useEffect(() => {
    if (!isOpen) {
      setName('');
      setClientSave(false);
      setSelectedKeys(null);
      setExpandedKeys({});
      setLoadingNodes(new Set());
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


    const buildFieldPath = (nodeKey) => {
      const parts = nodeKey.split('.');
      let currentNodes = treeNodes;
      let queryParts = [];
      let indent = 1;

      for (let i = 0; i < parts.length; i++) {
        const currentKey = parts.slice(0, i + 1).join('.');
        const node = findNodeByKey(currentNodes, currentKey);

        if (node) {
          const isLast = i === parts.length - 1;
          const indentStr = '  '.repeat(indent);

          if (isLast) {

            queryParts.push(`${indentStr}${node.data.name}`);
          } else {

            queryParts.push(`${indentStr}${node.data.name} {`);
            indent++;
          }


          if (node.children) {
            currentNodes = node.children;
          }
        }
      }


      for (let i = parts.length - 2; i >= 0; i--) {
        const indentStr = '  '.repeat(i + 1);
        queryParts.push(`${indentStr}}`);
      }

      return queryParts.join('\n');
    };

    const queryBody = buildFieldPath(selectedKeys);
    return queryBody ? `query {\n${queryBody}\n}` : '';
  };

  const selectedQuery = buildSelectedQuery();

  const handleIntegrate = async () => {
    if (name && selectedQuery && selectedFieldName) {
      setSaving(true);


      const currentQuery = queryEditor?.getValue() || '';

      try {
        const docRef = doc(db, 'gql', name);
        await setDoc(docRef, {
          body: currentQuery || '',
          clientSave: clientSave,
          index: selectedQuery || '',
        });
      } catch (error) {
        setSaving(false);
        return;
      }

      setName('');
      setClientSave(false);
      setSelectedKeys(null);
      setSaving(false);
      onClose();
    }
  };

  const footerContent = (
    <div className="flex p-4 items-center justify-end gap-3">
      <Button
        label="Cancel"
        onClick={onClose}
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
      onHide={() => { if (!isOpen) return; onClose(); }}
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
          {schema && treeNodes.length > 0 ? (
            <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden tree-scrollable-wrapper">
              <Tree
                value={treeNodes}
                selectionMode="single"
                selectionKeys={selectedKeys}
                onSelectionChange={handleNodeSelect}
                expandedKeys={expandedKeys}
                onToggle={handleToggle}
                onExpand={handleNodeExpand}
                loading={loadingNodes.size > 0}
                className="w-full"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-gray-500 bg-gray-50 border border-gray-300 rounded-lg" style={{ height: '400px' }}>
              {schema ? 'Loading schema fields...' : 'Loading schema... Please wait while GraphiQL loads the schema.'}
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
          plugins={[explorer]}
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

