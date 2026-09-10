import { loadApp } from './load-app.mjs';
const { api } = loadApp();
const rows = [];
for (const m of ['v60','chemex']){
  for (const p of Object.keys(api.ENGINE_PROFILE_MAP)){
    const only = api.PROFILE_INFO[p].methodOnly;
    if (only && only !== m) continue;
    for (const roast of ['light','medium','dark']){
      for (const st of [-1,0,1]){
        const vol = m === 'v60' ? 300 : 600;
        const r = api.computeRecipe(m, roast, p, vol, 'washed', false, 10, null, false, false, null, st);
        const gsr = r.grindStartingRange ? `${r.grindStartingRange.clicksMin}-${r.grindStartingRange.clicksMax}` : '';
        rows.push([m,p,roast,st,r.dose,r.ratioText,r.temp,r.totalTime,r.technique,
                   r.steps.map(s=>`${s.t}:${s.add}`).join('|'),
                   r.grindStartingPoint,gsr].join(';'));
      }
    }
  }
}
console.log(rows.join('\n'));
