import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, getDocs, doc } from 'firebase/firestore';

interface Part {
  id: string;
  partNumber: string;
  description: string;
  unitType: 'qty' | 'hours';
}

const Parts: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Part | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ partNumber: '', description: '', unitType: 'qty' as 'qty' | 'hours' });

  useEffect(() => { fetchParts(); }, []);

  const fetchParts = async () => {
    const snap = await getDocs(collection(db, 'parts'));
    setParts(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any);
  };

  const savePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await updateDoc(doc(db, 'parts', editing.id), form);
    } else {
      // de-dupe by partNumber
      const exists = parts.some(p => p.partNumber.trim().toLowerCase() === form.partNumber.trim().toLowerCase());
      if (!exists) {
        await addDoc(collection(db, 'parts'), form);
      }
    }
    setShowModal(false);
    setEditing(null);
    setForm({ partNumber: '', description: '', unitType: 'qty' });
    fetchParts();
  };

  const removePart = async (id: string) => {
    await deleteDoc(doc(db, 'parts', id));
    fetchParts();
  };

  const importCSV = async (file: File) => {
    const text = await file.text();
    const rows = text.split(/\r?\n/).filter(Boolean);
    // Expect headers: partNumber,description,unitType
    const [header, ...data] = rows;
    const cols = header.split(',').map(h => h.trim().toLowerCase());
    const pnIdx = cols.indexOf('partnumber');
    const descIdx = cols.indexOf('description');
    const utIdx = cols.indexOf('unittype');
    for (const row of data) {
      const cells = row.split(',');
      const candidate = {
        partNumber: (cells[pnIdx] || '').trim(),
        description: (cells[descIdx] || '').trim(),
        unitType: ((cells[utIdx] || 'qty').trim().toLowerCase() === 'hours' ? 'hours' : 'qty') as 'qty' | 'hours',
      };
      if (!candidate.partNumber) continue;
      const exists = parts.some(p => p.partNumber.trim().toLowerCase() === candidate.partNumber.toLowerCase());
      if (!exists) {
        await addDoc(collection(db, 'parts'), candidate);
      }
    }
    fetchParts();
  };

  const importIIF = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const line of lines) {
      // IIF format: !INVITEM	NAME	DESC	TYPE	ACCNT	ASSETACCNT	COGSACCNT	INCOMEACCNT	INVACCNT	PURCHASEDESC	ONHAND	COST	PRICE	PRICE1	PRICE2	PRICE3	PRICE4	PRICE5	WHOLESALE	UNIT	TAXABLE	PAYMETHOD	REORDERPOINT	EXTRA	VENDOR	USEPRICE	ACCNTTYPE	UOMSETREF	PREFVEND
      if (line.startsWith('!INVITEM')) continue; // Skip header
      if (!line.startsWith('INVITEM')) continue; // Only process inventory items
      
      const fields = line.split('\t');
      if (fields.length < 3) continue;
      
      const partNumber = fields[1]?.trim(); // NAME field
      const description = fields[2]?.trim(); // DESC field
      const unitType = fields[19]?.trim()?.toLowerCase() === 'hours' ? 'hours' : 'qty'; // UNIT field
      
      if (!partNumber) continue;
      
      const candidate = {
        partNumber: partNumber,
        description: description || partNumber,
        unitType: unitType as 'qty' | 'hours',
      };
      
      const exists = parts.some(p => p.partNumber.trim().toLowerCase() === candidate.partNumber.toLowerCase());
      if (!exists) {
        await addDoc(collection(db, 'parts'), candidate);
        importedCount++;
      } else {
        skippedCount++;
      }
    }
    
    alert(`IIF Import Complete!\nImported: ${importedCount} parts\nSkipped (duplicates): ${skippedCount} parts`);
    fetchParts();
  };

  const filtered = parts.filter(p =>
    p.partNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Parts</h1>
        <div className="flex gap-2">
          <div className="flex gap-2">
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => e.target.files && importCSV(e.target.files[0])} 
              className="text-gray-300 text-sm" 
              title="Import CSV file"
            />
            <input 
              type="file" 
              accept=".iif" 
              onChange={(e) => e.target.files && importIIF(e.target.files[0])} 
              className="text-gray-300 text-sm" 
              title="Import IIF (QuickBooks) file"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md">Add Part</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parts..." className="bg-gray-700 text-white px-4 py-2 rounded-md w-64" />
        <span className="text-gray-400">{filtered.length} parts</span>
      </div>

      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
        <h3 className="text-blue-300 font-semibold mb-2">📥 Import Parts</h3>
        <div className="text-sm text-gray-300 space-y-1">
          <p><strong>CSV Format:</strong> partNumber,description,unitType</p>
          <p><strong>IIF Format:</strong> QuickBooks inventory export (.iif file)</p>
          <p className="text-xs text-gray-400">Duplicate part numbers will be skipped automatically</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Catalogue</h2>
        </div>
        <div className="p-6 space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="text-white font-medium">{p.partNumber}</div>
                <div className="text-gray-400 text-sm">{p.description} • {p.unitType === 'hours' ? 'Hours' : 'Quantity'}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(p); setForm({ partNumber: p.partNumber, description: p.description, unitType: p.unitType }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">Edit</button>
                <button onClick={() => removePart(p.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm">Delete</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-gray-400">No parts found</div>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">{editing ? 'Edit Part' : 'Add Part'}</h2>
            <form onSubmit={savePart} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Part Number</label>
                <input value={form.partNumber} onChange={(e) => setForm({ ...form, partNumber: e.target.value })} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" required />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md" rows={3} />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Unit Type</label>
                <select value={form.unitType} onChange={(e) => setForm({ ...form, unitType: e.target.value as any })} className="w-full bg-gray-700 text-white px-3 py-2 rounded-md">
                  <option value="qty">Quantity</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md">Save</button>
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); setForm({ partNumber: '', description: '', unitType: 'qty' }); }} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parts;


