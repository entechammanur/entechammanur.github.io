import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const blankListing = {
  name: '', category: '', description: '', address: '', phone: '',
  latitude: '', longitude: '', is_published: false,
};
const resourceConfig = {
  landmarks: { table: 'entechemmanur_landmarks', fields: ['name', 'description', 'latitude', 'longitude', 'is_published'] },
  notices: { table: 'entechemmanur_notices', fields: ['title', 'body', 'severity', 'is_published'] },
  events: { table: 'entechemmanur_events', fields: ['title', 'description', 'starts_at', 'ends_at', 'venue', 'is_published'] },
  buses: { table: 'entechemmanur_bus_timings', fields: ['route_name', 'direction', 'departure_time', 'arrival_time', 'via', 'operating_days', 'is_published'] },
};

export default function ContentAdmin({ session, section = 'settings' }) {
  const [settings, setSettings] = useState([]);
  const [listings, setListings] = useState([]);
  const [editingListingId, setEditingListingId] = useState(null);
  const [resourceRows, setResourceRows] = useState({});
  const [resource, setResource] = useState(section === 'buses' ? 'buses' : 'landmarks');
  const [resourceDraft, setResourceDraft] = useState({});
  const [editingResourceId, setEditingResourceId] = useState(null);
  const [setting, setSetting] = useState({ key: '', value: '' });
  const [listing, setListing] = useState(blankListing);
  const [heroPreview, setHeroPreview] = useState('');
  const [uploadingHero, setUploadingHero] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (section === 'buses') setResource('buses');
    if (section === 'town' && resource === 'buses') setResource('landmarks');
  }, [section, resource]);

  const load = async () => {
    const [{ data: settingRows, error: settingsError }, { data: listingRows, error: listingsError }, ...resourceResults] = await Promise.all([
      supabase.from('entechemmanur_site_settings').select('key, value').order('key'),
      supabase.from('entechemmanur_directory_listings').select('*').order('created_at', { ascending: false }),
      ...Object.values(resourceConfig).map(({ table }) => supabase.from(table).select('*').order('created_at', { ascending: false })),
    ]);
    if (settingsError || listingsError) setError((settingsError || listingsError).message);
    setSettings(settingRows || []);
    setListings(listingRows || []);
    setResourceRows(Object.fromEntries(Object.keys(resourceConfig).map((key, index) => [key, resourceResults[index].data || []])));
  };

  useEffect(() => { load(); }, []);

  const saveSetting = async (event) => {
    event.preventDefault();
    setError('');
    const { error: saveError } = await supabase.from('entechemmanur_site_settings').upsert({
      key: setting.key.trim(),
      value: setting.value,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    });
    if (saveError) setError(saveError.message);
    else { setStatus(`${setting.key} saved.`); setSetting({ key: '', value: '' }); load(); }
  };

  const deleteSetting = async (key) => {
    const { error: deleteError } = await supabase.from('entechemmanur_site_settings').delete().eq('key', key);
    if (deleteError) setError(deleteError.message);
    else { setStatus(`${key} deleted.`); setSetting({ key: '', value: '' }); load(); }
  };

  const uploadHero = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Hero images must be smaller than 8 MB.');
      return;
    }
    setError('');
    setStatus('');
    setHeroPreview(URL.createObjectURL(file));
    setUploadingHero(true);
    const path = `hero/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
    const { error: uploadError } = await supabase.storage.from('entechemmanur_media').upload(path, file);
    if (uploadError) { setError(uploadError.message); setUploadingHero(false); return; }
    const { data } = supabase.storage.from('entechemmanur_media').getPublicUrl(path);
    const { error: saveError } = await supabase.from('entechemmanur_site_settings').upsert({
      key: 'hero_image_url',
      value: data.publicUrl,
      updated_by: session.user.id,
      updated_at: new Date().toISOString(),
    });
    setUploadingHero(false);
    if (saveError) setError(saveError.message);
    else {
      setSetting({ key: 'hero_image_url', value: data.publicUrl });
      setStatus('Hero image uploaded from your device and published.');
      load();
    }
  };

  const addListing = async (event) => {
    event.preventDefault();
    setError('');
    const request = editingListingId
      ? supabase.from('entechemmanur_directory_listings').update({
          ...listing,
          latitude: listing.latitude ? Number(listing.latitude) : null,
          longitude: listing.longitude ? Number(listing.longitude) : null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingListingId)
      : supabase.from('entechemmanur_directory_listings').insert({
      ...listing,
      latitude: listing.latitude ? Number(listing.latitude) : null,
      longitude: listing.longitude ? Number(listing.longitude) : null,
      created_by: session.user.id,
    });
    const { error: insertError } = await request;
    if (insertError) setError(insertError.message);
    else { setStatus(editingListingId ? 'Directory listing updated.' : 'Directory listing added.'); setListing(blankListing); setEditingListingId(null); load(); }
  };

  const deleteListing = async (id) => {
    const { error: deleteError } = await supabase.from('entechemmanur_directory_listings').delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else load();
  };

  const addResource = async (event) => {
    event.preventDefault();
    const config = resourceConfig[resource];
    const payload = { ...resourceDraft, created_by: session.user.id };
    ['latitude', 'longitude'].forEach((field) => {
      if (payload[field]) payload[field] = Number(payload[field]);
    });
    const request = editingResourceId
      ? supabase.from(config.table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingResourceId)
      : supabase.from(config.table).insert(payload);
    const { error: insertError } = await request;
    if (insertError) setError(insertError.message);
    else { setStatus(`${resource} entry ${editingResourceId ? 'updated' : 'added'}.`); setResourceDraft({}); setEditingResourceId(null); load(); }
  };

  const deleteResource = async (id) => {
    const { error: deleteError } = await supabase.from(resourceConfig[resource].table).delete().eq('id', id);
    if (deleteError) setError(deleteError.message);
    else load();
  };

  const editResource = (item) => {
    const draft = { ...item };
    ['created_at', 'updated_at', 'created_by', 'id'].forEach((key) => delete draft[key]);
    setResourceDraft(draft);
    setEditingResourceId(item.id);
  };

  const fields = ['name', 'category', 'description', 'address', 'phone', 'latitude', 'longitude'];

  return (
    <>
      {section === 'settings' && <section className="admin-panel">
        <div className="admin-panel-head"><div><div className="kicker">Homepage content</div><h2>Hero settings</h2></div><button className="admin-refresh" type="button" onClick={load}>Refresh</button></div>
        <p className="admin-muted">Edit homepage text or upload a replacement hero image directly from your device.</p>
        <div className="hero-upload-card">
          <div>
            <strong>Hero image</strong>
            <span>JPG, PNG, WebP · maximum 8 MB</span>
          </div>
          {heroPreview && <img src={heroPreview} alt="Selected hero preview" />}
          <label className="admin-upload-button">
            {uploadingHero ? 'Uploading…' : 'Choose image from device'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadHero} disabled={uploadingHero} />
          </label>
        </div>
        <div className="setting-list">
          {settings.map((item) => <div className="setting-row-wrap" key={item.key}><button className="setting-row" type="button" onClick={() => setSetting(item)}><strong>{item.key}</strong><span>{item.value}</span></button><button className="admin-delete" type="button" onClick={() => deleteSetting(item.key)}>Delete</button></div>)}
        </div>
        <form className="admin-form" onSubmit={saveSetting}>
          <label className="admin-field"><span>Setting key</span><input required value={setting.key} onChange={(event) => setSetting({ ...setting, key: event.target.value })} placeholder="hero_image_url" /></label>
          <label className="admin-field"><span>Value</span><textarea required value={setting.value} onChange={(event) => setSetting({ ...setting, value: event.target.value })} rows="4" /></label>
          <button className="admin-submit" type="submit">Save setting</button>
          {setting.key && <button className="admin-switch" type="button" onClick={() => setSetting({ key: '', value: '' })}>Clear editor</button>}
        </form>
      </section>}
      {(section === 'town' || section === 'buses') && <section className="admin-panel">
        <div className="admin-panel-head"><div><div className="kicker">{section === 'buses' ? 'Transport information' : 'Everything else'}</div><h2>{section === 'buses' ? 'Bus timings' : 'Town content'}</h2></div>{section === 'town' && <select className="admin-select" value={resource} onChange={(event) => { setResource(event.target.value); setResourceDraft({}); }}><option value="landmarks">Landmarks</option><option value="notices">Notices</option><option value="events">Events</option><option value="buses">Bus timings</option></select>}</div>
        <form className="admin-form" onSubmit={addResource}>
          {resourceConfig[resource].fields.map((field) => field === 'is_published'
            ? <label className="admin-check" key={field}><input type="checkbox" checked={Boolean(resourceDraft[field])} onChange={(event) => setResourceDraft({ ...resourceDraft, [field]: event.target.checked })} /> Published</label>
            : <label className="admin-field" key={field}><span>{field}</span>{field === 'body' || field === 'description' ? <textarea required={field === 'name' || field === 'title'} rows="3" value={resourceDraft[field] || ''} onChange={(event) => setResourceDraft({ ...resourceDraft, [field]: event.target.value })} /> : <input required={field === 'name' || field === 'title'} type={field.includes('_at') ? 'datetime-local' : 'text'} value={resourceDraft[field] || ''} onChange={(event) => setResourceDraft({ ...resourceDraft, [field]: event.target.value })} />}</label>
          )}
          <button className="admin-submit" type="submit">{editingResourceId ? `Save ${resource}` : `Add ${resource}`}</button>
          {editingResourceId && <button className="admin-switch" type="button" onClick={() => { setResourceDraft({}); setEditingResourceId(null); }}>Cancel edit</button>}
        </form>
        <div className="request-list admin-content-list">{(resourceRows[resource] || []).map((item) => <div className="request-row" key={item.id}><div><strong>{item.name || item.title || item.route_name}</strong><span>{item.description || item.body || item.venue || (item.direction ? `${item.direction} · ${item.departure_time}` : '')}</span></div><span className="request-status">{item.is_published ? 'published' : 'draft'}</span><button className="admin-refresh" type="button" onClick={() => editResource(item)}>Edit</button><button className="admin-delete" type="button" onClick={() => deleteResource(item.id)}>Delete</button></div>)}</div>
      </section>}

      {section === 'directory' && <section className="admin-panel">
        <div className="admin-panel-head"><div><div className="kicker">Community content</div><h2>Directory listings</h2></div></div>
        <form className="admin-form" onSubmit={addListing}>
          {fields.map((field) => <label className="admin-field" key={field}><span>{field}</span><input required={field === 'name' || field === 'category'} value={listing[field]} onChange={(event) => setListing({ ...listing, [field]: event.target.value })} /></label>)}
          <label className="admin-check"><input type="checkbox" checked={listing.is_published} onChange={(event) => setListing({ ...listing, is_published: event.target.checked })} /> Publish immediately</label>
          <button className="admin-submit" type="submit">{editingListingId ? 'Save listing' : 'Add listing'}</button>
          {editingListingId && <button className="admin-switch" type="button" onClick={() => { setListing(blankListing); setEditingListingId(null); }}>Cancel edit</button>}
        </form>
        <div className="request-list admin-content-list">
          {listings.map((item) => <div className="request-row" key={item.id}><div><strong>{item.name}</strong><span>{item.category} · {item.description}</span></div><span className="request-status">{item.is_published ? 'published' : 'draft'}</span><button className="admin-refresh" type="button" onClick={() => { setListing({ ...blankListing, ...item }); setEditingListingId(item.id); }}>Edit</button><button className="admin-delete" type="button" onClick={() => deleteListing(item.id)}>Delete</button></div>)}
        </div>
      </section>}
      {status && <p className="admin-success">{status}</p>}
      {error && <p className="admin-error">{error}</p>}
    </>
  );
}
