"""Build a private import bundle from the existing Site and a live Drive snapshot.
Run outside Git tracking; never commit the resulting personal data or photos.
"""
import argparse, datetime, hashlib, json, pathlib

p = argparse.ArgumentParser()
p.add_argument('--source-checkout', required=True)
p.add_argument('--snapshot', required=True)
p.add_argument('--context', required=True)
p.add_argument('--output', required=True)
p.add_argument('--observed-at', required=True, help='Timestamp of the source snapshot, not a new listing check')
a = p.parse_args()
source = pathlib.Path(a.source_checkout)
snapshot = json.loads(pathlib.Path(a.snapshot).read_text())
context = json.loads(pathlib.Path(a.context).read_text())
old = {x['id']: x for x in json.loads((source/'data/properties.json').read_text())}
photos = {x['id']: x for x in json.loads((source/'data/photos.json').read_text())}
drive = {x['title'].split('_')[0]: x['url'] for x in context['dossiers']}
rows = snapshot['Ranked Pool'][1:] + snapshot['Price Watch'][1:]
assert len({r[1] for r in rows}) == len(rows), 'Duplicate IDs across ranking and watch'
def records(tab):
    values = snapshot[tab]
    return [dict(zip(values[0], row)) for row in values[1:]]
costs = {r['Property ID']: r for r in records('Costs')}
scores = {r['Property ID']: r for r in records('Scores')}
evidence = records('Dossiers')
observations = records('Sources and Changes')
properties, media = [], []
for row in rows:
    identity = row[1]
    obj = dict(old.get(identity, {}))
    for key, n in [('id',1),('tier',2),('name',3),('province',4),('price',5),('size',6),('land',7),('score',8),('allLow',9),('allHigh',10),('why',11),('risks',12),('owner',13),('bb',14),('source',15)]:
        obj[key] = row[n] if len(row)>n else None
    obj['region'] = 'Abruzzo' if identity.startswith('AB') else 'Marche'
    obj.pop('rank', None)
    obj['costs'] = costs[identity]
    obj['components'] = {k:v for k,v in scores[identity].items() if k not in ['Property ID','Property','Total /100','Reason']}
    assert sum(v for v in obj['components'].values() if isinstance(v,(int,float))) == obj['score'], f'Score mismatch {identity}'
    obj['dossier'] = [{'topic':r['Assessment topic'], 'evidence':r['Evidence class'], 'text':r['Assessment and next verification'], 'source':r.get('Source','')} for r in evidence if r['Property ID']==identity]
    assert obj['dossier'], f'Missing dossier {identity}'
    obj['sources'] = [{'role':r.get('Source role',''), 'portal':r.get('Portal / domain',''), 'agent':r.get('Agent',''), 'url':r.get('Source URL',''), 'observed_price':r.get('Observed asking EUR'), 'first_seen':r.get('First seen in register',''), 'checked':r.get('Last checked',''), 'change':r.get('Change classification',''), 'note':r.get('Evidence / duplicate note','')} for r in observations if r['Property ID']==identity]
    obj['checked'] = max((s['checked'] for s in obj['sources'] if s['checked']),default=obj.get('checked',''))
    obj['driveUrl'] = drive.get(identity,'')
    obj['photos'] = []
    photo = photos.get(identity, {})
    obj['photoNotes'] = photo.get('notes','')
    for item in photo.get('images', []):
        file = source/'public'/item.get('asset_path','')
        if not file.is_file(): continue
        n=len(obj['photos'])
        obj['photos'].append({k:item.get(k,'') for k in ['url','source_url','caption','verified','dimensions']})
        media.append({'id':identity,'index':n,'path':str(file.resolve()),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
    properties.append(obj)
data = {'sourceRevision':'drive-'+hashlib.sha256(pathlib.Path(a.snapshot).read_bytes()).hexdigest()[:20], 'observedAt':a.observed_at, 'properties':properties, 'meta':{
    'profile': context['profile'],
    'profileUrl':'https://docs.google.com/document/d/1yDSmO52us09k350AyThpdmycSlF9C6QpML5Zqp0qrjs/edit',
    'registerUrl':'https://docs.google.com/spreadsheets/d/1vLKW3InRgrSU7LAxyeB3pFSRi9jcmVZM8wF_cZn5QD8/edit',
    'handbookUrl':json.loads((source/'data/site.json').read_text())['handbook_url'],
    'weeklyRuns':json.loads((source/'data/weekly_runs.json').read_text()),
    'sourceArchive':snapshot,
    'migration':{'source':'Drive + existing Site','sourceRevision':json.loads((source/'data/maintenance.json').read_text()) if (source/'data/maintenance.json').exists() else {}, 'feedbackSource':'Existing Site D1, read separately; spreadsheet feedback is historical'}
}}
out=pathlib.Path(a.output)
out.mkdir(parents=True,exist_ok=True)
(out/'properties.json').write_text(json.dumps(data,ensure_ascii=False))
(out/'media.json').write_text(json.dumps(media))
print(json.dumps({'properties':len(properties),'photos':len(media),'with_photos':sum(bool(p['photos']) for p in properties),'sourceRevision':data['sourceRevision']}))
