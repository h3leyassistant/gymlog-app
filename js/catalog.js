(function () {
  // fedb: the matching primaryMuscles value in free-exercise-db, for importing exercises later.
  const muscles = [
    ['neck', 'คอ', 'Neck', 'neck'], ['shoulders', 'ไหล่', 'Shoulders', 'shoulders'], ['traps', 'บ่า', 'Traps', 'traps'], ['chest', 'อก', 'Chest', 'chest'],
    ['back', 'หลังส่วนบน', 'Upper back', 'middle back'], ['lats', 'ปีก', 'Lats', 'lats'], ['lower-back', 'หลังล่าง', 'Lower back', 'lower back'],
    ['biceps', 'แขนหน้า', 'Biceps', 'biceps'], ['triceps', 'แขนหลัง', 'Triceps', 'triceps'], ['forearms', 'ปลายแขน', 'Forearms', 'forearms'],
    ['abs', 'หน้าท้อง', 'Abs', 'abdominals'], ['obliques', 'ท้องด้านข้าง', 'Obliques', 'abdominals'],
    ['quads', 'ต้นขาหน้า', 'Quads', 'quadriceps'], ['hamstrings', 'ต้นขาหลัง', 'Hamstrings', 'hamstrings'], ['glutes', 'ก้น', 'Glutes', 'glutes'],
    ['adductors', 'ต้นขาด้านใน', 'Adductors', 'adductors'], ['abductors', 'สะโพกด้านนอก', 'Abductors', 'abductors'], ['calves', 'น่อง', 'Calves', 'calves']
  ].map(([id, th, en, fedb]) => ({ id, th, en, fedb }));
  const exercises = [
    ['db-press', 'Dumbbell Shoulder Press', 'ดัมเบลยกเหนือศีรษะ', 'shoulders', 'dumbbell', 'press', 'นั่งยกดัมเบลจากระดับไหล่ขึ้นเหนือศีรษะ', 'ดันไหล่ โชลเดอร์เพรส OHP overhead press ยกดัมเบลเหนือหัว', true],
    ['lateral', 'Dumbbell Lateral Raise', 'ดัมเบลกางแขนด้านข้าง', 'shoulders', 'dumbbell', 'raise', 'ยืนถือดัมเบลแล้วกางแขนออกด้านข้าง', 'เล่นไหล่ด้านข้าง เลเทอรัล side raise', true],
    ['machine-press', 'Machine Shoulder Press', 'เครื่องดันไหล่', 'shoulders', 'machine', 'press', 'นั่งบนเครื่องแล้วดันมือจับขึ้นเหนือไหล่', 'เครื่องไหล่ โชลเดอร์เพรส OHP overhead press', false],
    ['db-bench', 'Dumbbell Bench Press', 'ดัมเบลดันอกบนม้านอน', 'chest', 'dumbbell', 'bench', 'นอนบนม้านั่ง ถือดัมเบลแล้วดันขึ้นเหนืออก', 'เบนช์เพรส ดันอก bench press chest press', true],
    ['chest-press', 'Machine Chest Press', 'เครื่องดันอก', 'chest', 'machine', 'seated', 'นั่งพิงเบาะแล้วดันมือจับออกไปด้านหน้า', 'เชสเพรส เครื่องอก', false],
    ['pec-fly', 'Pec Deck Fly', 'เครื่องหุบอก', 'chest', 'machine', 'fly', 'นั่งแล้วหุบแขนเข้าหากันด้านหน้าอก', 'เพคเด็ค ฟลาย', false],
    ['lat-pull', 'Lat Pulldown', 'เครื่องดึงลงฝึกหลัง', 'lats', 'machine', 'pull', 'นั่งใต้สายเคเบิล ดึงบาร์ลงมาหาลำตัว', 'แลทพูลดาวน์ ดึงหลัง ดึงปีก lat pull down', false],
    ['db-row', 'One-arm Dumbbell Row', 'ดัมเบลดึงหลังทีละข้าง', 'back', 'dumbbell', 'row', 'พยุงตัวบนม้านั่งแล้วดึงดัมเบลข้างลำตัว', 'โรว์ วันอาร์ม dumbbell row ดึงหลัง', true],
    ['seated-row', 'Seated Cable Row', 'เครื่องดึงหลังท่านั่ง', 'back', 'machine', 'seated', 'นั่งจับสายเคเบิลแล้วดึงมือจับเข้าหาลำตัว', 'เคเบิลโรว์ ซีทเต็ดโรว์ row ดึงหลัง', false],
    ['curl', 'Dumbbell Biceps Curl', 'ดัมเบลงอแขน', 'biceps', 'dumbbell', 'curl', 'ถือดัมเบลข้างตัวแล้วงอศอกยกขึ้น', 'ไบเซป เคิร์ล bicep curl', true],
    ['hammer', 'Dumbbell Hammer Curl', 'ดัมเบลงอแขนจับแนวตั้ง', 'biceps', 'dumbbell', 'curl', 'งอแขนโดยจับดัมเบลแนวตั้ง ฝ่ามือหันเข้าหากัน', 'แฮมเมอร์ ค้อน', true],
    ['pushdown', 'Cable Triceps Pushdown', 'เคเบิลกดแขนหลัง', 'triceps', 'machine', 'curl', 'ยืนหน้าเครื่องแล้วเหยียดศอกกดมือจับลง', 'ไตรเซป พุชดาวน์ เชือก', false],
    ['extension', 'Dumbbell Overhead Extension', 'ดัมเบลเหยียดแขนหลังเหนือหัว', 'triceps', 'dumbbell', 'press', 'จับดัมเบลหนึ่งลูกสองมือ ยกจากด้านหลังศีรษะ', 'โอเวอร์เฮด ไตรเซป triceps extension', false],
    ['crunch', 'Machine Ab Crunch', 'เครื่องม้วนหน้าท้อง', 'abs', 'machine', 'seated', 'นั่งบนเครื่องและม้วนลำตัวเข้าด้านหน้า', 'แอบครันช์ ท้อง ซิตอัพ', false],
    ['goblet', 'Dumbbell Goblet Squat', 'สควอตถือดัมเบลหน้าอก', 'quads', 'dumbbell', 'squat', 'ถือดัมเบลหนึ่งลูกที่หน้าอกแล้วนั่งย่อลง', 'ก็อบเล็ต สควอท', false],
    ['leg-press', 'Leg Press', 'เครื่องถีบขา', 'quads', 'machine', 'legs', 'นั่งพิงเบาะ ใช้เท้าดันแผ่นรับเท้าออก', 'เลกเพรส', false],
    ['leg-extension', 'Leg Extension', 'เครื่องเหยียดขา', 'quads', 'machine', 'legs', 'นั่งแล้วเหยียดเข่ายกแผ่นรองบริเวณหน้าแข้ง', 'เลกเอ็กซ์เทนชัน', false],
    ['rdl', 'Dumbbell Romanian Deadlift', 'ดัมเบลพับสะโพก', 'hamstrings', 'dumbbell', 'row', 'ถือดัมเบลไว้หน้าขาแล้วพับตัวจากสะโพก', 'อาร์ดีแอล RDL เดดลิฟต์ deadlift', true],
    ['leg-curl', 'Seated Leg Curl', 'เครื่องงอขาท่านั่ง', 'hamstrings', 'machine', 'legs', 'นั่งแล้วงอเข่าดึงแผ่นรองขาลง', 'เลกเคิร์ล', false],
    ['hip-thrust', 'Machine Hip Thrust', 'เครื่องดันสะโพก', 'glutes', 'machine', 'bench', 'พิงหลังกับเบาะแล้วดันสะโพกขึ้น', 'ฮิปทรัสต์ ก้น', false],
    ['calf', 'Dumbbell Calf Raise', 'ถือดัมเบลเขย่งน่อง', 'calves', 'dumbbell', 'calf', 'ยืนถือดัมเบลแล้วเขย่งส้นเท้าขึ้น', 'คาล์ฟเรส เขย่ง', true],
    ['rear-fly', 'Reverse Pec Deck', 'เครื่องกางแขนเล่นไหล่หลัง', 'shoulders', 'machine', 'fly', 'นั่งหันหน้าเข้าเบาะ แล้วกางแขนไปด้านหลัง', 'รีเวิร์สฟลาย ไหล่หลัง เรียร์เดลท์', false],
    ['shrug', 'Dumbbell Shrug', 'ดัมเบลยักไหล่', 'traps', 'dumbbell', 'calf', 'ยืนถือดัมเบลข้างลำตัวแล้วยกไหล่ขึ้นหาหู', 'ชรัก ยักไหล่ บ่า', true],
    ['straight-arm', 'Straight-arm Cable Pulldown', 'เคเบิลดึงแขนตรงลง', 'lats', 'machine', 'pull', 'ยืนหน้าเคเบิล แขนเหยียด กดบาร์ลงมาที่ต้นขา', 'สเตรทอาร์ม ปีก', false],
    ['pullover', 'Dumbbell Pullover', 'ดัมเบลพูลโอเวอร์', 'lats', 'dumbbell', 'bench', 'นอนบนม้านั่ง จับดัมเบลลูกเดียวแล้วเหวี่ยงแขนจากเหนือหัวมาเหนืออก', 'พูลโอเวอร์ ปีก', false],
    ['back-ext', 'Back Extension', 'เครื่องยืดหลัง', 'lower-back', 'machine', 'row', 'ล็อกขาไว้กับเครื่อง พับตัวลงแล้วยกลำตัวขึ้นจนตรง', 'แบ็คเอ็กซ์เทนชัน หลังล่าง ไฮเปอร์', false],
    ['wrist-curl', 'Dumbbell Wrist Curl', 'ดัมเบลงอข้อมือ', 'forearms', 'dumbbell', 'seated', 'วางแขนบนต้นขา แล้วงอข้อมือยกดัมเบลขึ้น', 'ริสต์เคิร์ล ข้อมือ', true],
    ['farmer', 'Dumbbell Farmer Carry', 'ถือดัมเบลเดิน', 'forearms', 'dumbbell', 'calf', 'ถือดัมเบลหนักสองข้างแล้วเดินลำตัวตรง', 'ฟาร์มเมอร์ แครี่ กริป', true],
    ['side-bend', 'Dumbbell Side Bend', 'ดัมเบลเอียงลำตัว', 'obliques', 'dumbbell', 'raise', 'ถือดัมเบลข้างเดียวแล้วเอียงลำตัวลงและกลับขึ้น', 'ไซด์เบนด์ ท้องข้าง', false],
    ['neck-machine', '4-Way Neck Machine', 'เครื่องบริหารคอ', 'neck', 'machine', 'seated', 'นั่งพิงแผ่นรองศีรษะ แล้วดันศีรษะไปทางหน้า หลัง หรือด้านข้าง', 'คอ เน็ค', false],
    ['adduction', 'Hip Adduction Machine', 'เครื่องหนีบขา', 'adductors', 'machine', 'seated', 'นั่งแล้วหนีบแผ่นรองขาเข้าหากัน', 'แอดดักชัน หนีบขา ขาด้านใน', false],
    ['sumo-squat', 'Dumbbell Sumo Squat', 'ดัมเบลสควอตขากว้าง', 'adductors', 'dumbbell', 'squat', 'ยืนกางขากว้าง ปลายเท้าชี้ออก ถือดัมเบลลูกเดียวแล้วนั่งย่อลง', 'ซูโม่ สควอท ขาด้านใน', false],
    ['abduction', 'Hip Abduction Machine', 'เครื่องกางขา', 'abductors', 'machine', 'seated', 'นั่งแล้วดันแผ่นรองขาออกด้านข้าง', 'แอบดักชัน กางขา สะโพกข้าง', false],
    ['cable-abduction', 'Cable Hip Abduction', 'เคเบิลกางขาด้านข้าง', 'abductors', 'machine', 'raise', 'ยืนข้างเคเบิล คล้องข้อเท้า แล้วกางขาออกด้านข้าง', 'กางขา เคเบิล สะโพกข้าง', true],
    ['woodchop', 'Cable Woodchop', 'เคเบิลบิดลำตัว', 'obliques', 'machine', 'pull', 'ดึงเคเบิลเฉียงข้ามลำตัวพร้อมบิดสะโพก', 'วูดช็อป บิดตัว ท้องข้าง', false]
  ].map(([id, name, th, muscle, equipment, pose, description, aliases, perSide]) => ({ id, name, th, muscle, equipment, pose, description, aliases, perSide, also: [] }));
  // Secondary muscles, so tapping e.g. Lats also lists rows that work them.
  const secondary = {
    'db-press': ['triceps'], 'machine-press': ['triceps'], lateral: ['traps'], 'db-bench': ['triceps', 'shoulders'], 'chest-press': ['triceps', 'shoulders'],
    'pec-fly': ['shoulders'], 'lat-pull': ['back', 'biceps'], 'db-row': ['lats', 'biceps'], 'seated-row': ['lats', 'biceps'], pullover: ['chest'],
    curl: ['forearms'], hammer: ['forearms'], goblet: ['glutes'], 'leg-press': ['glutes', 'hamstrings'], rdl: ['glutes', 'lower-back'],
    'leg-curl': ['calves'], 'hip-thrust': ['hamstrings'], 'rear-fly': ['back', 'traps'], 'back-ext': ['glutes', 'hamstrings'], farmer: ['traps'],
    woodchop: ['abs'], 'sumo-squat': ['quads', 'glutes'], abduction: ['glutes'], 'cable-abduction': ['glutes']
  };
  for (const e of exercises) e.also = secondary[e.id] || [];
  // Start/end photos from free-exercise-db (assets/exercises/<id>-0.webp, -1.webp); others keep the sketch.
  const photos = new Set(["db-press", "lateral", "machine-press", "db-bench", "chest-press", "pec-fly", "lat-pull", "db-row", "seated-row", "curl", "hammer", "pushdown", "extension", "crunch", "goblet", "leg-press", "leg-extension", "rdl", "leg-curl", "hip-thrust", "calf", "rear-fly", "shrug", "straight-arm", "pullover", "back-ext", "wrist-curl", "farmer", "side-bend", "woodchop", "adduction", "sumo-squat", "abduction"]);
  const photoNotes = { goblet: 'ภาพใช้ kettlebell แทนดัมเบล', 'hip-thrust': 'ภาพใช้บาร์เบลแทนเครื่อง', rdl: 'ภาพเป็นท่าดัมเบลขาตึง ใกล้เคียง RDL' };
  function normalize(s) { return s.toLowerCase().normalize('NFKC').replace(/[\s-]/g, ''); }
  // Every word of the query must appear somewhere (name, Thai name, aliases or primary muscle), in any order.
  function search(query = '', muscle = '', equipment = '') {
    const words = query.trim().split(/\s+/).map(normalize).filter(Boolean);
    const matches = e => {
      const text = normalize([e.name, e.th, e.aliases, ...[muscles.find(x => x.id === e.muscle)].map(m => `${m.th} ${m.en}`)].join(' '));
      return words.every(w => text.includes(w));
    };
    return exercises
      .filter(e => (!muscle || e.muscle === muscle || e.also.includes(muscle)) && (!equipment || e.equipment === equipment) && matches(e))
      .sort((a, b) => (muscle ? (a.muscle !== muscle) - (b.muscle !== muscle) : 0));
  }
  function thumbnail(e) {
    if (photos.has(e.id)) return `<img src="assets/exercises/${e.id}-0.webp" alt="" loading="lazy" decoding="async">`;
    return sketch(e);
  }
  function sketch(e) {
    const poses = {
      press: ['42,30 42,53 33,75', '42,53 54,75', '42,36 26,34 26,17', '42,36 58,34 58,17', [26, 17, 58, 17]],
      raise: ['42,30 42,53 34,75', '42,53 51,75', '42,35 26,33 14,29', '42,35 58,33 70,29', [14, 29, 70, 29]],
      curl: ['42,30 42,53 34,75', '42,53 51,75', '42,35 29,49 22,33', '42,35 57,49 64,33', [22, 33, 64, 33]],
      pull: ['42,30 42,53 59,55 61,75', '42,53 29,55 27,75', '42,36 25,25 17,12', '42,36 59,25 67,12', [17, 12, 67, 12]],
      row: ['32,33 56,47 65,73', '56,47 47,71', '32,34 26,51 29,63', '36,35 51,30 54,40', [29, 63, 54, 40]],
      bench: ['25,44 50,44 65,62 65,75', '50,44 46,67', '31,44 29,24 29,12', '39,44 47,26 47,12', [29, 12, 47, 12]],
      seated: ['38,30 40,52 62,53 64,75', '40,52 26,55 24,75', '38,35 50,43 65,35', '38,35 49,36 60,29', [65, 35, 60, 29]],
      fly: ['42,30 42,53 33,75', '42,53 54,75', '42,36 22,35 26,19', '42,36 62,35 58,19', [26, 19, 58, 19]],
      squat: ['42,29 36,47 22,58 36,75', '36,47 58,56 51,75', '42,34 55,41 49,29', '42,34 29,41 35,29', [42, 29, 42, 29]],
      legs: ['32,30 35,53 54,53 70,43', '35,53 51,64 66,58', '33,36 25,47 25,53', '33,36 44,46 45,53', [70, 43, 66, 58]],
      calf: ['42,27 42,51 36,70 43,72', '42,51 52,70 59,72', '42,33 26,43 26,56', '42,33 59,43 59,56', [26, 56, 59, 56]]
    };
    const p = poses[e.pose] || poses.press;
    const head = e.pose === 'bench' ? [17, 41] : e.pose === 'row' ? [26, 25] : e.pose === 'legs' ? [31, 21] : [42, 20];
    return `<svg viewBox="0 0 84 84" aria-hidden="true"><path d="M12 77H74" stroke="#465057"/><g fill="none" stroke="#bdc3c6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${p.slice(0,4).map(d=>`<polyline points="${d}"/>`).join('')}</g><circle cx="${head[0]}" cy="${head[1]}" r="7" fill="#bdc3c6"/><g stroke="#ff8547" stroke-width="4" stroke-linecap="round">${[0,2].map(i=>`<path d="M${p[4][i]-6} ${p[4][i+1]}h12"/>`).join('')}</g>${e.equipment==='machine'?'<path d="M9 76V8H75V76" fill="none" stroke="#465057" stroke-width="2"/>':''}</svg>`;
  }
  window.GymCatalog = { muscles, exercises, search, thumbnail, sketch, hasPhoto: e => photos.has(e.id), photoNote: e => photoNotes[e.id] || '', get: id => exercises.find(e => e.id === id), muscle: id => muscles.find(m => m.id === id) };
})();
