import React, { useState, useEffect } from 'react';

interface Attribute {
  name: string;
  value: string;
}

interface AttributesEditorProps {
  attributes: Attribute[];
  onChange: (attributes: Attribute[]) => void;
}

const AttributesEditor: React.FC<AttributesEditorProps> = ({ attributes, onChange }) => {
  const [newAttribute, setNewAttribute] = useState<Attribute>({ name: '', value: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [attributes]);

  const handleAddAttribute = () => {
    if (newAttribute.name && newAttribute.value) {
      if (attributes.some(attr => attr.name === newAttribute.name)) {
        setError('Attribute name must be unique');
        return;
      }
      onChange([...attributes, newAttribute]);
      setNewAttribute({ name: '', value: '' });
    } else {
      setError('Both name and value are required');
    }
  };

  const handleRemoveAttribute = (index: number) => {
    const updatedAttributes = attributes.filter((_, i) => i !== index);
    onChange(updatedAttributes);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAttribute(prev => ({ ...prev, [name]: value }));
  };

  const handleEditAttribute = (index: number) => {
    setEditingIndex(index);
  };

  const handleSaveEdit = (index: number, updatedAttribute: Attribute) => {
    const updatedAttributes = attributes.map((attr, i) => 
      i === index ? updatedAttribute : attr
    );
    onChange(updatedAttributes);
    setEditingIndex(null);
  };

  const renderAttributeRow = (attr: Attribute, index: number) => {
    if (editingIndex === index) {
      return (
        <tr key={index}>
          <td>
            <input
              type="text"
              value={attr.name}
              onChange={(e) => handleSaveEdit(index, { ...attr, name: e.target.value })}
            />
          </td>
          <td>
            <input
              type="text"
              value={attr.value}
              onChange={(e) => handleSaveEdit(index, { ...attr, value: e.target.value })}
            />
          </td>
          <td>
            <button onClick={() => setEditingIndex(null)}>Save</button>
          </td>
        </tr>
      );
    }
    return (
      <tr key={index}>
        <td>{attr.name}</td>
        <td>{attr.value}</td>
        <td>
          <button onClick={() => handleEditAttribute(index)}>Edit</button>
          <button onClick={() => handleRemoveAttribute(index)}>Remove</button>
        </td>
      </tr>
    );
  };

  return (
    <div className="attributes-editor">
      <h3>Attributes Editor</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {attributes.map((attr, index) => renderAttributeRow(attr, index))}
        </tbody>
      </table>
      <div className="add-attribute">
        <input
          type="text"
          name="name"
          value={newAttribute.name}
          onChange={handleInputChange}
          placeholder="Attribute name"
        />
        <input
          type="text"
          name="value"
          value={newAttribute.value}
          onChange={handleInputChange}
          placeholder="Attribute value"
        />
        <button onClick={handleAddAttribute}>Add Attribute</button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="json-preview">
        <h4>JSON Preview</h4>
        <pre>{JSON.stringify(attributes, null, 2)}</pre>
      </div>
    </div>
  );
};

export default AttributesEditor;