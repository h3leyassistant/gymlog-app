(function () {
  // Paths follow the muscle grooves in the image; see tools/segment_anatomy.py. Each group has a part on
  // skin (`d`, colour-blended so shading shows) and, where the shorts cover it, a part on fabric (`fabric`, a plain tint).
  const { front, back } = window.GymAnatomyRegions;
  const svg = document.getElementById('anatomy');
  let current = 'front', selected = 'shoulders', callback;
  function draw() {
    document.getElementById('body-crop-rect').setAttribute('x', current === 'front' ? '225' : '870');
    svg.setAttribute('viewBox', current === 'front' ? '225 0 440 1000' : '870 0 440 1000');
    svg.setAttribute('aria-label', `ภาพร่างกาย${current === 'front' ? 'ด้านหน้า' : 'ด้านหลัง'} กดกลุ่มกล้ามเนื้อเพื่อเลือก`);
    const map = current === 'front' ? front : back;
    const layers = r => (r.d ? `<path class="on-skin" d="${r.d}" mask="url(#body-alpha)"/>` : '') + (r.fabric ? `<path class="on-fabric" d="${r.fabric}" mask="url(#body-alpha)"/>` : '');
    document.getElementById('muscle-regions').innerHTML = Object.entries(map).map(([id, r]) => `<g class="muscle-region${id === selected ? ' selected' : ''}" data-muscle="${id}" role="button" tabindex="0" aria-label="เลือก${GymCatalog.muscle(id).th}" aria-pressed="${id===selected}"><title>${GymCatalog.muscle(id).th}</title>${layers(r)}</g>`).join('')
      + (map[selected] ? `<path class="muscle-outline" mask="url(#body-alpha)" d="${map[selected].d}${map[selected].fabric}"/>` : '');
  }
  svg.addEventListener('click', e => { const region=e.target.closest('[data-muscle]');if(region)callback?.(region.dataset.muscle); });
  svg.addEventListener('keydown', e => { if(['Enter',' '].includes(e.key) && e.target.matches('[data-muscle]')) {e.preventDefault();callback?.(e.target.dataset.muscle);} });
  const probe = new Image(); probe.onerror = () => { document.getElementById('image-error').hidden=false; };probe.src='assets/anatomy-cutout.webp';
  window.GymAnatomy = {
    onSelect(fn) { callback=fn; },
    select(id) { selected=id; if(id && !Object.hasOwn(current==='front'?front:back,id)) current=Object.hasOwn(front,id)?'front':Object.hasOwn(back,id)?'back':current;draw();return current; },
    setView(view) { current=view;draw(); },
    getView() {return current;}
  };
  draw();
})();
