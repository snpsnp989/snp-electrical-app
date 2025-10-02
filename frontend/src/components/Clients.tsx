import React, { useEffect, useState } from 'react';
import { 
  getClients, createClient, updateClient, deleteClient,
  getEndCustomers, createEndCustomer, getSites, createSite, updateSite
} from '../services/firebaseService';

interface Client { id: string; name: string; contact_name?: string; email?: string; phone?: string; address?: string; suburb?: string; state?: string; postcode?: string; country?: string; is_active?: boolean; customers?: EndCustomer[]; }
interface EndCustomer { id: string; name: string; contact_name?: string; email?: string; phone?: string; address?: string; suburb?: string; state?: string; postcode?: string; country?: string; is_active?: boolean; sites?: Site[]; }
interface Site { id: string; name: string; address?: string; suburb?: string; state?: string; postcode?: string; country?: string; site_contact?: string; notes?: string; is_active?: boolean; }

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', contact_name: '', email: '', phone: '', address: '', suburb: '', state: 'VIC', postcode: '', country: 'Australia' });
  const [customerForm, setCustomerForm] = useState({ name: '', contact_name: '', email: '', phone: '', address: '', suburb: '', state: '', postcode: '', country: '' });
  const [siteForm, setSiteForm] = useState({ name: '', address: '', suburb: '', state: '', postcode: '', country: '', site_contact: '', notes: '', equipment: [] as string[] });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingClientForm, setEditingClientForm] = useState({ name: '', contact_name: '', email: '', phone: '', address: '', suburb: '', state: '', postcode: '', country: '' });
  const [editingCustomer, setEditingCustomer] = useState<{ clientId: string; customer: EndCustomer } | null>(null);
  const [editingCustomerForm, setEditingCustomerForm] = useState({ name: '', contact_name: '', email: '', phone: '', address: '', suburb: '', state: '', postcode: '', country: '' });
  const [editingSite, setEditingSite] = useState<{ clientId: string; customerId: string; site: Site } | null>(null);
  const [editingSiteForm, setEditingSiteForm] = useState({ name: '', address: '', suburb: '', state: '', postcode: '', country: '', site_contact: '', notes: '', equipment: [] as string[] });
  const [clientSearch, setClientSearch] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddCustomerFor, setShowAddCustomerFor] = useState<string | null>(null);
  const [showAddSiteFor, setShowAddSiteFor] = useState<{ clientId: string; customerId: string } | null>(null);

  useEffect(() => { 
    refresh(); 
    fetchEquipment(); 
  }, []);

  const fetchEquipment = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:5001' 
        : 'http://192.168.0.223:5001';
      
      const response = await fetch(`${apiUrl}/api/equipment`);
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const refresh = async () => {
    setLoading(true);
    const base = await getClients();
    // Load end-customers and sites for ALL clients so the view is always expanded
    const enriched = await Promise.all((base as any[]).map(async (c) => {
      const customers = await getEndCustomers(c.id);
      const withSites = await Promise.all((customers as any[]).map(async (cu) => ({
        ...cu,
        sites: await getSites(c.id, cu.id)
      })));
      return { ...c, customers: withSites };
    }));
    setClients(enriched as any);
    setLoading(false);
  };

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    await createClient(clientForm);
    setClientForm({ name: '', contact_name: '', email: '', phone: '', address: '', suburb: '', state: '', postcode: '', country: '' });
    refresh();
  };

  const addEndCustomer = async (clientId: string, e: React.FormEvent) => {
    e.preventDefault();
    await createEndCustomer(clientId, customerForm);
    setCustomerForm({ name: '', contact_name: '', email: '', phone: '', address: '', suburb: '', state: '', postcode: '', country: '' });
    // reload that client's customers by toggling
    loadChildren(clientId);
  };

  const addSite = async (clientId: string, customerId: string, e: React.FormEvent) => {
    e.preventDefault();
    await createSite(clientId, customerId, siteForm);
    setSiteForm({ name: '', address: '', suburb: '', state: '', postcode: '', country: '', site_contact: '', notes: '', equipment: [] as string[] });
    loadChildren(clientId);
  };

  const loadChildren = async (clientId: string) => {
    // attach customers and sites under the client on demand
    const customers = await getEndCustomers(clientId);
    const withSites = await Promise.all((customers as any[]).map(async (c) => ({
      ...c,
      sites: await getSites(clientId, c.id)
    })));
    setClients(prev => prev.map(c => c.id === clientId ? ({ ...(c as any), customers: withSites }) : c));
  };

  const editCustomer = (clientId: string, customer: EndCustomer) => {
    setEditingCustomer({ clientId, customer });
    setEditingCustomerForm({
      name: customer.name || '',
      contact_name: customer.contact_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      suburb: customer.suburb || '',
      state: customer.state || '',
      postcode: customer.postcode || '',
      country: customer.country || ''
    });
  };

  const editSite = (clientId: string, customerId: string, site: Site) => {
    setEditingSite({ clientId, customerId, site });
    setEditingSiteForm({
      name: site.name || '',
      address: site.address || '',
      suburb: site.suburb || '',
      state: site.state || '',
      postcode: site.postcode || '',
      country: site.country || '',
      site_contact: site.site_contact || '',
      notes: site.notes || '',
      equipment: (site as any).equipment || []
    });
  };

  const updateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    // Note: You'll need to implement updateEndCustomer in firebaseService
    // await updateEndCustomer(editingCustomer.clientId, editingCustomer.customer.id, editingCustomerForm);
    setEditingCustomer(null);
    refresh();
  };

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    try {
      await updateSite(editingSite.clientId, editingSite.customerId, editingSite.site.id, editingSiteForm);
      setEditingSite(null);
      refresh();
    } catch (error) {
      console.error('Error updating site:', error);
    }
  };

  const disableCustomer = async (clientId: string, customerId: string) => {
    try {
      // Find the customer to get current status
      const client = clients.find(c => c.id === clientId);
      const customer = client?.customers?.find((c: any) => c.id === customerId);
      const newStatus = customer?.is_active !== false ? false : true;
      const action = newStatus ? 'enable' : 'disable';
      
      if (!window.confirm(`${action === 'disable' ? 'Disable' : 'Enable'} this end customer?`)) return;
      
      // TODO: Call firebaseService to update customer status
      // await disableEndCustomer(clientId, customerId, newStatus);
      
      // For now, update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? {
                ...client,
                customers: client.customers?.map((cust: any) => 
                  cust.id === customerId 
                    ? { ...cust, is_active: newStatus }
                    : cust
                )
              }
            : client
        )
      );
    } catch (error) {
      console.error('Error toggling customer status:', error);
    }
  };

  const disableSite = async (clientId: string, customerId: string, siteId: string) => {
    try {
      // Find the site to get current status
      const client = clients.find(c => c.id === clientId);
      const customer = client?.customers?.find((c: any) => c.id === customerId);
      const site = customer?.sites?.find((s: any) => s.id === siteId);
      const newStatus = site?.is_active !== false ? false : true;
      const action = newStatus ? 'enable' : 'disable';
      
      if (!window.confirm(`${action === 'disable' ? 'Disable' : 'Enable'} this site?`)) return;
      
      // TODO: Call firebaseService to update site status
      // await disableSite(clientId, customerId, siteId, newStatus);
      
      // For now, update local state
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId 
            ? {
                ...client,
                customers: client.customers?.map((cust: any) => 
                  cust.id === customerId 
                    ? {
                        ...cust,
                        sites: cust.sites?.map((s: any) => 
                          s.id === siteId 
                            ? { ...s, is_active: newStatus }
                            : s
                        )
                      }
                    : cust
                )
              }
            : client
        )
      );
    } catch (error) {
      console.error('Error toggling site status:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Clients</h1>
        <div className="flex items-center gap-3">
          <button onClick={()=>setShowAddClient(true)} className="bg-darker-blue hover:bg-blue-700 text-white px-4 py-2 rounded-md">Add Client</button>
          {loading && <span className="text-gray-400 text-sm">Loading…</span>}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={clientSearch}
          onChange={(e)=>setClientSearch(e.target.value)}
          placeholder="Search clients..."
          className="bg-gray-700 text-white px-4 py-2 rounded-md w-64"
        />
        <span className="text-gray-400">{clients.length} clients</span>
      </div>

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-white mb-4">Add Client</h2>
            <form onSubmit={(e)=>{addClient(e); setShowAddClient(false);}} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Company full width */}
              <input className="bg-gray-700 text-white px-3 py-3 rounded-md md:col-span-6" placeholder="Company name" value={clientForm.name} onChange={e=>setClientForm({...clientForm, name: e.target.value})} required />
              {/* Contact + Phone */}
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Contact person" value={clientForm.contact_name} onChange={e=>setClientForm({...clientForm, contact_name: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Phone" value={clientForm.phone} onChange={e=>setClientForm({...clientForm, phone: e.target.value})} />
              {/* Email full row */}
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-6" placeholder="Email" value={clientForm.email} onChange={e=>setClientForm({...clientForm, email: e.target.value})} />
              {/* Address row */}
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Address" value={clientForm.address} onChange={e=>setClientForm({...clientForm, address: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Suburb" value={clientForm.suburb} onChange={e=>setClientForm({...clientForm, suburb: e.target.value})} />
              <select className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" value={clientForm.state} onChange={e=>setClientForm({...clientForm, state: e.target.value})}>
                <option value="ACT">ACT</option>
                <option value="NSW">NSW</option>
                <option value="NT">NT</option>
                <option value="QLD">QLD</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="VIC">VIC</option>
                <option value="WA">WA</option>
              </select>
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Postcode" value={clientForm.postcode} onChange={e=>setClientForm({...clientForm, postcode: e.target.value})} />
              {/* Country + Save */}
              <div className="flex gap-3 md:col-span-6 justify-end">
                <input className="bg-gray-700 text-white px-3 py-2 rounded-md flex-1 md:flex-initial md:w-64" placeholder="Country" value={clientForm.country} readOnly />
                <button type="submit" className="bg-darker-blue hover:bg-blue-700 text-white px-6 py-2 rounded-md">Save</button>
              </div>
            </form>
            <div className="mt-4 flex justify-end">
              <button onClick={()=>setShowAddClient(false)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add End-Customer Modal */}
      {showAddCustomerFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-white mb-4">Add End-Customer</h2>
            <form onSubmit={(e)=>{ if (showAddCustomerFor) { addEndCustomer(showAddCustomerFor, e); setShowAddCustomerFor(null);} }} className="grid grid-cols-1 md:grid-cols-8 gap-4">
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-4" placeholder="End-customer name" value={customerForm.name} onChange={e=>setCustomerForm({...customerForm, name: e.target.value})} required />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-4" placeholder="Contact" value={customerForm.contact_name} onChange={e=>setCustomerForm({...customerForm, contact_name: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-8" placeholder="Email" value={customerForm.email} onChange={e=>setCustomerForm({...customerForm, email: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-4" placeholder="Address" value={customerForm.address} onChange={e=>setCustomerForm({...customerForm, address: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-2" placeholder="Suburb" value={customerForm.suburb} onChange={e=>setCustomerForm({...customerForm, suburb: e.target.value})} />
              <select className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" value={customerForm.state} onChange={e=>setCustomerForm({...customerForm, state: e.target.value})}>
                <option value="">State</option>
                <option value="ACT">ACT</option>
                <option value="NSW">NSW</option>
                <option value="NT">NT</option>
                <option value="QLD">QLD</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="VIC">VIC</option>
                <option value="WA">WA</option>
              </select>
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Postcode" value={customerForm.postcode} onChange={e=>setCustomerForm({...customerForm, postcode: e.target.value})} />
              <div className="flex gap-3 md:col-span-8 justify-end">
                <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:w-64" placeholder="Phone" value={customerForm.phone} onChange={e=>setCustomerForm({...customerForm, phone: e.target.value})} />
                <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:w-64" placeholder="Country" value={customerForm.country || 'Australia'} readOnly />
                <button type="submit" className="bg-darker-blue hover:bg-blue-700 text-white px-6 py-2 rounded-md">Add</button>
              </div>
            </form>
            <div className="mt-4 flex justify-end">
              <button onClick={()=>setShowAddCustomerFor(null)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Clients list */}
      <div className="bg-gray-800 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">All Clients</h2>
        </div>
        <div className="p-6 space-y-4">
          {clients
            .filter((cl: any) => {
              const q = clientSearch.toLowerCase();
              if (!q) return true;
              return (
                (cl.name || '').toLowerCase().includes(q) ||
                (cl.contact_name || '').toLowerCase().includes(q) ||
                (cl.email || '').toLowerCase().includes(q) ||
                (cl.suburb || '').toLowerCase().includes(q) ||
                (cl.state || '').toLowerCase().includes(q)
              );
            })
            .map((cl: any) => (
            <div key={cl.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white font-medium">{cl.name}</div>
                  <div className="text-gray-400 text-sm">{cl.contact_name || 'No contact'} {cl.email ? `• ${cl.email}` : ''}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setExpandedClient(expandedClient === cl.id ? null : cl.id); loadChildren(cl.id); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">{expandedClient === cl.id ? 'Hide' : 'Manage Customers'}</button>
                  <button onClick={() => { setShowAddCustomerFor(cl.id); }} className="bg-darker-blue hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">Add End-Customer</button>
                  <button onClick={() => { setEditingClient(cl); setEditingClientForm({ name: cl.name || '', contact_name: (cl as any).contact_name || '', email: (cl as any).email || '', phone: (cl as any).phone || '', address: (cl as any).address || '', suburb: (cl as any).suburb || '', state: (cl as any).state || '', postcode: (cl as any).postcode || '', country: (cl as any).country || '' }); }} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm">Edit</button>
                  <button onClick={async ()=>{ await deleteClient(cl.id); refresh(); }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm">Delete</button>
                </div>
              </div>

              {expandedClient === cl.id && (
                <div className="mt-4 space-y-4">
                  {/* List end-customers */}
                  {(cl.customers || []).map((cust: any) => (
                    <div key={cust.id} className="bg-gray-800 rounded-md p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            <span className="select-none">📂</span>
                            {cust.name}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              cust.is_active !== false 
                                ? 'bg-green-900 text-green-300' 
                                : 'bg-red-900 text-red-300'
                            }`}>
                              {cust.is_active !== false ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                          <div className="text-gray-400 text-sm">{cust.contact_name || 'No contact'} • {(cust.sites || []).length} site{(cust.sites || []).length === 1 ? '' : 's'}</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setShowAddSiteFor({ clientId: cl.id, customerId: cust.id })} className="bg-darker-blue hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm">Add Site</button>
                          <button onClick={() => editCustomer(cl.id, cust)} className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-md text-sm">Edit</button>
                          <button onClick={() => disableCustomer(cl.id, cust.id)} className={`px-3 py-1 rounded-md text-sm ${
                            cust.is_active !== false
                              ? 'bg-orange-600 hover:bg-orange-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}>
                            {cust.is_active !== false ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                          {/* Sites list only; add via modal */}

                          {/* Sites list as tree/branches */}
                          <div className="space-y-2 pl-4 border-l border-gray-600">
                            {(cust.sites || []).map((s: Site) => (
                              <div key={s.id} className={`flex items-start gap-3 p-3 rounded-md ${s.is_active !== false ? 'bg-gray-700' : 'bg-gray-600 opacity-75'}`}>
                                <div className="text-gray-300 select-none">🌿</div>
                                <div className="flex-1">
                                  <div className="text-white font-medium flex items-center gap-2">
                                    {[s.address, s.suburb, s.state, s.postcode].filter(Boolean).join(', ') || 'Address not set'}
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      s.is_active !== false 
                                        ? 'bg-green-900 text-green-300' 
                                        : 'bg-red-900 text-red-300'
                                    }`}>
                                      {s.is_active !== false ? 'Active' : 'Disabled'}
                                    </span>
                                  </div>
                                  {s.site_contact && <div className="text-gray-400 text-sm">Contact: {s.site_contact}</div>}
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => editSite(cl.id, cust.id, s)} className="bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded text-xs">Edit</button>
                                  <button onClick={() => disableSite(cl.id, cust.id, s.id)} className={`px-2 py-1 rounded text-xs ${
                                    s.is_active !== false
                                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                  }`}>
                                    {s.is_active !== false ? 'Disable' : 'Enable'}
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(cust.sites || []).length === 0 && (
                              <div className="text-gray-400 text-sm">No sites yet</div>
                            )}
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {clients.length === 0 && <div className="text-gray-400">No clients yet</div>}
        </div>
      </div>
      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Client</h2>
            <form onSubmit={async (e) => { e.preventDefault(); await updateClient(editingClient.id, editingClientForm); setEditingClient(null); refresh(); }} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <input className="bg-gray-700 text-white px-3 py-3 rounded-md md:col-span-6" placeholder="Company name" value={editingClientForm.name} onChange={e=>setEditingClientForm({...editingClientForm, name: e.target.value})} required />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Contact person" value={editingClientForm.contact_name} onChange={e=>setEditingClientForm({...editingClientForm, contact_name: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Phone" value={editingClientForm.phone} onChange={e=>setEditingClientForm({...editingClientForm, phone: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-6" placeholder="Email" value={editingClientForm.email} onChange={e=>setEditingClientForm({...editingClientForm, email: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Address" value={editingClientForm.address} onChange={e=>setEditingClientForm({...editingClientForm, address: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Suburb" value={editingClientForm.suburb} onChange={e=>setEditingClientForm({...editingClientForm, suburb: e.target.value})} />
              <select className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" value={editingClientForm.state} onChange={e=>setEditingClientForm({...editingClientForm, state: e.target.value})}>
                <option value="ACT">ACT</option>
                <option value="NSW">NSW</option>
                <option value="NT">NT</option>
                <option value="QLD">QLD</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="VIC">VIC</option>
                <option value="WA">WA</option>
              </select>
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Postcode" value={editingClientForm.postcode} onChange={e=>setEditingClientForm({...editingClientForm, postcode: e.target.value})} />
              <div className="flex gap-3 md:col-span-6 justify-end">
                <input className="bg-gray-700 text-white px-3 py-2 rounded-md flex-1 md:flex-initial md:w-64" placeholder="Country" value={editingClientForm.country || 'Australia'} readOnly />
                <button type="submit" className="bg-darker-blue hover:bg-blue-700 text-white px-6 py-2 rounded-md">Save</button>
              </div>
              <div className="md:col-span-6 flex justify-end">
                <button type="button" onClick={()=>setEditingClient(null)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Site Modal */}
      {showAddSiteFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-white mb-4">Add Site</h2>
            <form onSubmit={(e)=>{ addSite(showAddSiteFor.clientId, showAddSiteFor.customerId, e); setShowAddSiteFor(null); }} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Site name full width */}
              <input className="bg-gray-700 text-white px-3 py-3 rounded-md md:col-span-6" placeholder="Site name (optional)" value={siteForm.name} onChange={e=>setSiteForm({...siteForm, name: e.target.value})} />
              {/* Contact + Notes */}
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Site contact" value={siteForm.site_contact} onChange={e=>setSiteForm({...siteForm, site_contact: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Notes" value={siteForm.notes} onChange={e=>setSiteForm({...siteForm, notes: e.target.value})} />
              {/* Equipment Selection */}
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Equipment</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {equipment.filter(eq => eq.is_active !== false).map((eq) => (
                    <label key={eq.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={siteForm.equipment.includes(eq.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSiteForm({...siteForm, equipment: [...siteForm.equipment, eq.id]});
                          } else {
                            setSiteForm({...siteForm, equipment: siteForm.equipment.filter(id => id !== eq.id)});
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-darker-blue focus:ring-darker-blue"
                      />
                      <span className="text-gray-300">{eq.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Address row */}
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Address" value={siteForm.address} onChange={e=>setSiteForm({...siteForm, address: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Suburb" value={siteForm.suburb} onChange={e=>setSiteForm({...siteForm, suburb: e.target.value})} />
              <select className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" value={siteForm.state} onChange={e=>setSiteForm({...siteForm, state: e.target.value})}>
                <option value="">State</option>
                <option value="ACT">ACT</option>
                <option value="NSW">NSW</option>
                <option value="NT">NT</option>
                <option value="QLD">QLD</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="VIC">VIC</option>
                <option value="WA">WA</option>
              </select>
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Postcode" value={siteForm.postcode} onChange={e=>setSiteForm({...siteForm, postcode: e.target.value})} />
              {/* Country + Save */}
              <div className="flex gap-3 md:col-span-6 justify-end">
                <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:w-64" placeholder="Country" value={siteForm.country || 'Australia'} readOnly />
                <button type="submit" className="bg-darker-blue hover:bg-blue-700 text-white px-6 py-2 rounded-md">Add Site</button>
              </div>
            </form>
            <div className="mt-4 flex justify-end">
              <button onClick={()=>setShowAddSiteFor(null)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit End Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-white mb-4">Edit End Customer</h2>
            <form onSubmit={updateCustomer} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <input className="bg-gray-700 text-white px-3 py-3 rounded-md md:col-span-6" placeholder="Company name" value={editingCustomerForm.name} onChange={e=>setEditingCustomerForm({...editingCustomerForm, name: e.target.value})} required />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Contact person" value={editingCustomerForm.contact_name} onChange={e=>setEditingCustomerForm({...editingCustomerForm, contact_name: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Phone" value={editingCustomerForm.phone} onChange={e=>setEditingCustomerForm({...editingCustomerForm, phone: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-6" placeholder="Email" value={editingCustomerForm.email} onChange={e=>setEditingCustomerForm({...editingCustomerForm, email: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Address" value={editingCustomerForm.address} onChange={e=>setEditingCustomerForm({...editingCustomerForm, address: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Suburb" value={editingCustomerForm.suburb} onChange={e=>setEditingCustomerForm({...editingCustomerForm, suburb: e.target.value})} />
              <select className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" value={editingCustomerForm.state} onChange={e=>setEditingCustomerForm({...editingCustomerForm, state: e.target.value})}>
                <option value="ACT">ACT</option>
                <option value="NSW">NSW</option>
                <option value="NT">NT</option>
                <option value="QLD">QLD</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="VIC">VIC</option>
                <option value="WA">WA</option>
              </select>
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Postcode" value={editingCustomerForm.postcode} onChange={e=>setEditingCustomerForm({...editingCustomerForm, postcode: e.target.value})} />
              <div className="flex gap-3 md:col-span-6 justify-end">
                <input className="bg-gray-700 text-white px-3 py-2 rounded-md flex-1 md:flex-initial md:w-64" placeholder="Country" value={editingCustomerForm.country || 'Australia'} readOnly />
                <button type="submit" className="bg-darker-blue hover:bg-blue-700 text-white px-6 py-2 rounded-md">Save</button>
              </div>
              <div className="md:col-span-6 flex justify-end">
                <button type="button" onClick={()=>setEditingCustomer(null)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      {editingSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl">
            <h2 className="text-xl font-semibold text-white mb-4">Edit Site</h2>
            <form onSubmit={handleUpdateSite} className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <input className="bg-gray-700 text-white px-3 py-3 rounded-md md:col-span-6" placeholder="Site name (optional)" value={editingSiteForm.name} onChange={e=>setEditingSiteForm({...editingSiteForm, name: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Site contact" value={editingSiteForm.site_contact} onChange={e=>setEditingSiteForm({...editingSiteForm, site_contact: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Notes" value={editingSiteForm.notes} onChange={e=>setEditingSiteForm({...editingSiteForm, notes: e.target.value})} />
              {/* Equipment Selection */}
              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Equipment</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {equipment.filter(eq => eq.is_active !== false).map((eq) => (
                    <label key={eq.id} className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editingSiteForm.equipment.includes(eq.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingSiteForm({...editingSiteForm, equipment: [...editingSiteForm.equipment, eq.id]});
                          } else {
                            setEditingSiteForm({...editingSiteForm, equipment: editingSiteForm.equipment.filter(id => id !== eq.id)});
                          }
                        }}
                        className="rounded border-gray-600 bg-gray-700 text-darker-blue focus:ring-darker-blue"
                      />
                      <span className="text-gray-300">{eq.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-3" placeholder="Address" value={editingSiteForm.address} onChange={e=>setEditingSiteForm({...editingSiteForm, address: e.target.value})} />
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Suburb" value={editingSiteForm.suburb} onChange={e=>setEditingSiteForm({...editingSiteForm, suburb: e.target.value})} />
              <select className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" value={editingSiteForm.state} onChange={e=>setEditingSiteForm({...editingSiteForm, state: e.target.value})}>
                <option value="ACT">ACT</option>
                <option value="NSW">NSW</option>
                <option value="NT">NT</option>
                <option value="QLD">QLD</option>
                <option value="SA">SA</option>
                <option value="TAS">TAS</option>
                <option value="VIC">VIC</option>
                <option value="WA">WA</option>
              </select>
              <input className="bg-gray-700 text-white px-3 py-2 rounded-md md:col-span-1" placeholder="Postcode" value={editingSiteForm.postcode} onChange={e=>setEditingSiteForm({...editingSiteForm, postcode: e.target.value})} />
              <div className="flex gap-3 md:col-span-6 justify-end">
                <input className="bg-gray-700 text-white px-3 py-2 rounded-md flex-1 md:flex-initial md:w-64" placeholder="Country" value={editingSiteForm.country || 'Australia'} readOnly />
                <button type="submit" className="bg-darker-blue hover:bg-blue-700 text-white px-6 py-2 rounded-md">Save</button>
              </div>
              <div className="md:col-span-6 flex justify-end">
                <button type="button" onClick={()=>setEditingSite(null)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md">Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;


