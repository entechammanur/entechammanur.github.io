import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { parseLocationInput } from './lib/location';
import { aboutSettingFields, defaultAboutSettings } from './lib/siteSettings';

const blankListing = {
  name: '', category: '', description: '', address: '', phone: '', whatsapp: '',
  photo_url: '', latitude: '', longitude: '', is_published: false,
};
const representativeCategories = ['leadership', 'representative', 'ward member', 'panchayat'];
const resourceConfig = {
  landmarks: { table: 'entechemmanur_landmarks', fields: ['name', 'description', 'stop_label', 'location_input', 'route_order', 'is_map_highlighted', 'is_published'] },
  notices: { table: 'entechemmanur_notices', fields: ['title', 'body', 'severity', 'is_published'] },
  events: { table: 'entechemmanur_events', fields: ['title', 'description', 'starts_at', 'ends_at', 'venue', 'is_published'] },
  buses: { table: 'entechemmanur_bus_timings', fields: ['bus_name', 'route_name', 'direction', 'departure_time', 'arrival_time', 'via', 'operating_days', 'is_published'] },
};

function isRepresentative(entry) {
  const category = String(entry.category || '').toLowerCase();
  return representativeCategories.some((term) => category.includes(term));
}

export default function ContentAdmin({ session, section = 'settings' }) {
  const [settings, setSettings] = useState([]);
  const [aboutDraft, setAboutDraft] = useState(defaultAboutSettings);
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
  const [uploadingListingPhoto, setUploadingListingPhoto] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (section === 'buses') setResource('buses');
    if (section === 'town' && resource === 'buses') setResource('landmarks');
  }, [section, resource]);

  useEffect(() => {
    setListing(blankListing);
    setEditingListingId(null);
  }, [section]);

  const load = async () => {
    const [{ data: settingRows, error: settingsError }, { data: listingRows, error: listingsError }, ...resourceResults] = await Promise.all([
      supabase.from('entechemmanur_site_settings').select('key, value').order('key'),
      supabase.from('entechemmanur_directory_listings').select('*').order('created_at', { ascending: false }),
      ...Object.values(resourceConfig).map(({ table }) => supabase.from(table).select('*').order('created_at', { ascending: false })),
    ]);
    const resourceError = resourceResults.find((result) => result.error)?.error;
    if (settingsError || listingsError || resourceError) setError((settingsError || listingsError || resourceError).message);
    setSettings(settingRows || []);
    const savedSettings = Object.fromEntries((settingRows || []).map(({ key, value }) => [key, value]));
    setAboutDraft(Object.fromEntries(
      Object.keys(defaultAboutSettings).map((key) => [key, savedSettings[key] ?? defaultAboutSettings[key]]),
    ));
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

  const saveAbout = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    const updatedAt = new Date().toISOString();
    const rows = aboutSettingFields.map(({ key }) => ({
      key,
      value: aboutDraft[key].trim(),
      updated_by: session.user.id,
      updated_at: updatedAt,
    }));
    const { error: saveError } = await supabase.from('entechemmanur_site_settings').upsert(rows);
    if (saveError) setError(saveError.message);
    else {
      setStatus('About Chammanur details saved.');
      load();
    }
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

  const uploadListingPhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Photos must be smaller than 8 MB.');
      return;
    }

    setError('');
    setStatus('');
    setUploadingListingPhoto(true);
    const path = `directory/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '-')}`;
    try {
      const { error: uploadError } = await supabase.storage.from('entechemmanur_media').upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from('entechemmanur_media').getPublicUrl(path);
      setListing((current) => ({ ...current, photo_url: data.publicUrl }));
      setStatus('Photo uploaded. Save the listing to publish it.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The photo could not be uploaded.');
    } finally {
      setUploadingListingPhoto(false);
      event.target.value = '';
    }
  };

  const addListing = async (event) => {
    event.preventDefault();
    setError('');
    const isPerson = section === 'people';
    if (!isPerson && isRepresentative({ category: listing.category })) {
      setError('Add public representatives from the People section.');
      return;
    }
    const payload = {
      ...listing,
      name: listing.name.trim(),
      category: isPerson ? 'Leadership' : listing.category.trim(),
      description: listing.description.trim(),
      address: listing.address.trim(),
      phone: listing.phone.trim() || null,
      whatsapp: listing.whatsapp.trim() || null,
      photo_url: listing.photo_url.trim() || null,
      latitude: listing.latitude ? Number(listing.latitude) : null,
      longitude: listing.longitude ? Number(listing.longitude) : null,
    };
    const request = editingListingId
      ? supabase.from('entechemmanur_directory_listings').update({
          ...payload,
          updated_at: new Date().toISOString(),
        }).eq('id', editingListingId)
      : supabase.from('entechemmanur_directory_listings').insert({
      ...payload,
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
    if (resource === 'landmarks') {
      const parsed = parseLocationInput(payload.location_input || '');
      if (!parsed.coordinates) {
        setError('Paste a Google Maps link containing coordinates, a latitude/longitude pair, or a full Plus Code.');
        return;
      }
      payload.latitude = parsed.coordinates.latitude;
      payload.longitude = parsed.coordinates.longitude;
      payload.location_type = parsed.type;
    }
    ['latitude', 'longitude', 'route_order'].forEach((field) => {
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
    if (resource === 'landmarks' && !draft.location_input && draft.latitude != null && draft.longitude != null) {
      draft.location_input = `${draft.latitude}, ${draft.longitude}`;
    }
    setResourceDraft(draft);
    setEditingResourceId(item.id);
  };

  const isPeopleSection = section === 'people';
  const fields = isPeopleSection
    ? ['name', 'description', 'address', 'phone', 'whatsapp', 'photo_url']
    : ['name', 'category', 'description', 'address', 'phone', 'whatsapp', 'photo_url', 'latitude', 'longitude'];
  const visibleListings = listings.filter((item) => isRepresentative(item) === isPeopleSection);
  const parsedLocation = resource === 'landmarks' ? parseLocationInput(resourceDraft.location_input || '') : null;

  return (
    <>
      {section === 'settings' && <section className="admin-panel">
        <div className="admin-panel-head"><div><div className="kicker">Homepage content</div><h2>Homepage settings</h2></div><button className="admin-refresh" type="button" onClick={load}>Refresh</button></div>
        <div className="admin-subsection">
          <div className="kicker">About Chammanur</div>
          <p className="admin-muted">Update the location description and PIN code shown on the public homepage.</p>
          <form className="admin-form" onSubmit={saveAbout}>
            {aboutSettingFields.map(({ key, label, multiline }) => (
              <label className="admin-field" key={key}>
                <span>{label}</span>
                {multiline
                  ? <textarea rows="3" value={aboutDraft[key]} onChange={(event) => setAboutDraft({ ...aboutDraft, [key]: event.target.value })} />
                  : <input required value={aboutDraft[key]} onChange={(event) => setAboutDraft({ ...aboutDraft, [key]: event.target.value })} />}
              </label>
            ))}
            <button className="admin-submit" type="submit">Save About details</button>
          </form>
        </div>
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
          {settings.filter((item) => !Object.hasOwn(defaultAboutSettings, item.key)).map((item) => <div className="setting-row-wrap" key={item.key}><button className="setting-row" type="button" onClick={() => setSetting(item)}><strong>{item.key}</strong><span>{item.value}</span></button><button className="admin-delete" type="button" onClick={() => deleteSetting(item.key)}>Delete</button></div>)}
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
        {resource === 'landmarks' && <div className="admin-muted location-help">
          <strong>Location input</strong>
          <span>Paste a Google Maps link that contains coordinates, enter latitude followed by longitude (for example: 10.67085, 76.00207), or paste a full Plus Code. Coordinates are required to place a landmark on the map.</span>
          {parsedLocation?.coordinates && <span className="location-detected">Detected {parsedLocation.type.replaceAll('_', ' ')} · Latitude {parsedLocation.coordinates.latitude.toFixed(6)}, Longitude {parsedLocation.coordinates.longitude.toFixed(6)}</span>}
          {parsedLocation?.type === 'short_google_maps_link' && <span className="location-help-error">Short Google Maps links cannot be resolved here. Open the place in Google Maps, copy its latitude and longitude, and paste them as “latitude, longitude”.</span>}
          {parsedLocation && !parsedLocation.coordinates && parsedLocation.type !== 'empty' && parsedLocation.type !== 'short_google_maps_link' && <span className="location-help-error">No coordinates were found. Use a full Google Maps link containing coordinates, a latitude/longitude pair, or a full Plus Code.</span>}
        </div>}
        <form className="admin-form" onSubmit={addResource}>
          {resourceConfig[resource].fields.map((field) => field === 'is_published' || field === 'is_map_highlighted'
            ? <label className="admin-check" key={field}><input type="checkbox" checked={Boolean(resourceDraft[field])} onChange={(event) => setResourceDraft({ ...resourceDraft, [field]: event.target.checked })} /> {field === 'is_map_highlighted' ? 'Highlight on the map' : 'Published'}</label>
            : <label className="admin-field" key={field}><span>{field === 'location_input' ? 'Location (latitude, longitude)' : field === 'stop_label' ? 'Map label' : field === 'bus_name' ? 'Bus name' : field.replaceAll('_', ' ')}</span>{field === 'body' || field === 'description' ? <textarea required={field === 'name' || field === 'title'} rows="3" value={resourceDraft[field] ?? ''} onChange={(event) => setResourceDraft({ ...resourceDraft, [field]: event.target.value })} /> : <input required={field === 'name' || field === 'title' || (resource === 'buses' && field === 'bus_name') || (resource === 'landmarks' && field === 'location_input')} placeholder={field === 'location_input' ? '10.67085, 76.00207 or paste a full Google Maps link' : field === 'stop_label' ? 'Example: MAIN JUNCTION or STOP 04' : field === 'bus_name' ? 'Enter the bus or service name' : undefined} type={field.includes('_at') ? 'datetime-local' : ['latitude', 'longitude', 'route_order'].includes(field) ? 'number' : 'text'} step={field === 'route_order' ? '1' : 'any'} value={resourceDraft[field] ?? ''} onChange={(event) => setResourceDraft({ ...resourceDraft, [field]: event.target.value })} />}</label>
          )}
          <button className="admin-submit" type="submit">{editingResourceId ? `Save ${resource}` : `Add ${resource}`}</button>
          {editingResourceId && <button className="admin-switch" type="button" onClick={() => { setResourceDraft({}); setEditingResourceId(null); }}>Cancel edit</button>}
        </form>
        <div className="request-list admin-content-list">{(resourceRows[resource] || []).map((item) => <div className="request-row" key={item.id}><div><strong>{item.name || item.title || item.route_name}</strong><span>{item.description || item.body || item.venue || (item.direction ? `${item.direction} · ${item.departure_time}` : '')}</span></div><span className="request-status">{item.is_published ? 'published' : 'draft'}</span><button className="admin-refresh" type="button" onClick={() => editResource(item)}>Edit</button><button className="admin-delete" type="button" onClick={() => deleteResource(item.id)}>Delete</button></div>)}</div>
      </section>}

      {(section === 'directory' || section === 'people') && <section className="admin-panel">
        <div className="admin-panel-head"><div><div className="kicker">{isPeopleSection ? 'Representatives' : 'Local places and services'}</div><h2>{isPeopleSection ? 'People and representatives' : 'Places and services'}</h2></div></div>
        <p className="admin-muted">{isPeopleSection
          ? 'Add verified public representatives here. Enter their role in the description and ward or office in the address. Publish only public contact details.'
          : 'Add verified local businesses, services, and places here. Representatives have a separate People section. Location coordinates are optional for directory listings.'}</p>
        <form className="admin-form" onSubmit={addListing}>
          {fields.map((field) => (
            <label className="admin-field" key={field}>
              <span>{field === 'photo_url' ? 'Photo URL' : field === 'description' && isPeopleSection ? 'Role / position' : field === 'address' && isPeopleSection ? 'Ward / office' : field.replaceAll('_', ' ')}</span>
              {field === 'description'
                ? <textarea rows="3" value={listing[field] || ''} onChange={(event) => setListing({ ...listing, [field]: event.target.value })} />
                : <input
                    type={field === 'photo_url' ? 'url' : 'text'}
                    required={field === 'name' || field === 'category'}
                    value={listing[field] || ''}
                    onChange={(event) => setListing({ ...listing, [field]: event.target.value })}
                  />}
            </label>
          ))}
          <label className="admin-upload-button">
            {uploadingListingPhoto ? 'Uploading photo…' : 'Upload a photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadListingPhoto} disabled={uploadingListingPhoto} />
          </label>
          {listing.photo_url && <img className="listing-photo-preview" src={listing.photo_url} alt="Directory photo preview" width="640" height="480" />}
          <label className="admin-check"><input type="checkbox" checked={listing.is_published} onChange={(event) => setListing({ ...listing, is_published: event.target.checked })} /> Publish immediately</label>
          <button className="admin-submit" type="submit">{editingListingId ? 'Save listing' : 'Add listing'}</button>
          {editingListingId && <button className="admin-switch" type="button" onClick={() => { setListing(blankListing); setEditingListingId(null); }}>Cancel edit</button>}
        </form>
        <div className="request-list admin-content-list">
          {visibleListings.map((item) => <div className="request-row" key={item.id}><div><strong>{item.name}</strong><span>{isPeopleSection ? [item.description, item.address].filter(Boolean).join(' · ') : `${item.category} · ${item.description || ''}`}</span></div><span className="request-status">{item.is_published ? 'published' : 'draft'}</span><button className="admin-refresh" type="button" onClick={() => { setListing({ ...blankListing, ...item }); setEditingListingId(item.id); }}>Edit</button><button className="admin-delete" type="button" onClick={() => deleteListing(item.id)}>Delete</button></div>)}
        </div>
      </section>}
      {status && <p className="admin-success">{status}</p>}
      {error && <p className="admin-error">{error}</p>}
    </>
  );
}
