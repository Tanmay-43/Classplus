/* AttendEase front-end logic (vanilla JS) */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
let D = { students: [], classes: [], subjects: [] };
let threshold = 75, nextId = 100, viewId = null, onSave = null;
const TITLES = { dashboard: 'Dashboard', students: 'Students', attendance: 'Attendance', reports: 'Reports', classes: 'Classes & Subjects', settings: 'Settings', profile: 'Student Profile' };
const WEEK = [['Mon', 92], ['Tue', 88], ['Wed', 85], ['Thu', 90], ['Fri', 81]];
const MONTHS = [['Apr', 86], ['May', 83], ['Jun', 88], ['Jul', 79], ['Aug', 84], ['Sep', 90]];

/* ---------- helpers ---------- */
const pct = s => s.total ? Math.round(s.present / s.total * 1000) / 10 : 0;
const level = p => p >= threshold ? ['Good', 'good'] : p >= 60 ? ['Warning', 'warn'] : ['Critical', 'crit'];
const initials = n => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const badge = (t, c) => `<span class="badge b-${c || t.toLowerCase()}">${t}</span>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avg = list => list.length ? Math.round(list.reduce((a, s) => a + pct(s), 0) / list.length * 10) / 10 : 0;
const who = s => `<div class="who"><span class="avatar sm">${initials(s.name)}</span>${esc(s.name)}</div>`;
const byId = id => D.students.find(s => s.id === id);

function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}

/* ---------- navigation ---------- */
function go(page) {
  $$('.page').forEach(p => p.hidden = p.id !== 'page-' + page);
  const nav = page === 'profile' ? 'students' : page;
  $$('.sidebar nav a').forEach(a => a.classList.toggle('active', a.dataset.page === nav));
  $('#pageTitle').textContent = TITLES[page]; $('#sidebar').classList.remove('open');
  ({ dashboard: renderDashboard, students: renderStudents, attendance: renderAttendance, reports: renderReports, classes: renderClasses }[page] || (() => { }))();
}
$$('.sidebar nav a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(a.dataset.page); }));
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');

/* ---------- charts ---------- */
function barChart(el, data, suffix = '%') {
  $(el).innerHTML = `<div class="bars">${data.map(([l, v]) => `<div class="col"><b>${v}${suffix}</b><i style="height:${v * 1.2}px"></i>${esc(l)}</div>`).join('')}</div>`;
}
function donut(el, parts) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1; let acc = 0;
  const grad = parts.map(p => { const a = acc / total * 100; acc += p.v; return `${p.c} ${a}% ${acc / total * 100}%`; }).join(',');
  $(el).innerHTML = `<div class="donut" style="background:conic-gradient(${grad})"><div>${Math.round(parts[0].v / total * 100)}%</div></div>
  <div class="legend">${parts.map(p => `<div><i style="background:${p.c}"></i>${p.l}: <b>${p.v}</b></div>`).join('')}</div>`;
}
function lineChart(el, data) {
  const w = 300, h = 160, min = 60, max = 100;
  const pts = data.map((d, i) => [20 + i * (w - 40) / (data.length - 1), h - 20 - (d[1] - min) / (max - min) * (h - 40)]);
  $(el).innerHTML = `<svg class="line" viewBox="0 0 ${w} ${h + 10}" style="width:100%;height:190px">
   <polyline fill="none" stroke="#4f46e5" stroke-width="2.5" points="${pts.map(p => p.join(',')).join(' ')}"/>
   ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4" fill="#fff" stroke="#4f46e5" stroke-width="2"/><text x="${p[0]}" y="${p[1] - 9}" font-size="9" text-anchor="middle" fill="#1e2433">${data[i][1]}%</text><text x="${p[0]}" y="${h + 6}" font-size="9" text-anchor="middle" fill="#6b7385">${data[i][0]}</text>`).join('')}</svg>`;
}

/* ---------- dashboard ---------- */
function stat(label, val, cls = '') { return `<div class="stat ${cls}"><span>${label}</span><b>${val}</b></div>`; }
function renderDashboard() {
  const S = D.students, pres = S.filter(s => s.today.status !== 'Absent').length;
  $('#dashStats').innerHTML = stat('Total Students', S.length) + stat('Present Today', pres, 'g') + stat('Absent Today', S.length - pres, 'r') + stat('Average Attendance', avg(S) + '%', 'o');
  const c = k => S.filter(s => s.today.status === k).length;
  donut('#donut', [{ l: 'Present', v: c('Present'), c: '#16a34a' }, { l: 'Late', v: c('Late'), c: '#d97706' }, { l: 'Absent', v: c('Absent'), c: '#dc2626' }]);
  lineChart('#weekTrend', WEEK);
  $('#todayBody').innerHTML = S.map(s => `<tr><td>${who(s)}</td><td>${esc(s.roll)}</td><td>${esc(s.cls)}</td><td>${esc(s.today.subject)}</td><td>${badge(s.today.status)}</td><td>${badge(pct(s) + '%', level(pct(s))[1])}</td></tr>`).join('');
  const recent = S.flatMap(s => s.history.slice(0, 1).map(h => ({ s, h }))).slice(0, 6);
  $('#activity').innerHTML = recent.map(({ s, h }) => `<li><span class="avatar sm">${initials(s.name)}</span><div>${esc(s.name)}<small>${esc(h.subject)} &middot; ${h.date}</small></div><span class="right">${badge(h.status)}</span></li>`).join('');
  const low = S.filter(s => pct(s) < threshold).sort((a, b) => pct(a) - pct(b));
  $('#lowList').innerHTML = low.length ? low.map(s => `<li><span class="avatar sm">${initials(s.name)}</span><div>${esc(s.name)}<small>${esc(s.cls)} &middot; ${esc(s.roll)}</small></div><span class="right">${badge(pct(s) + '%', level(pct(s))[1])}</span></li>`).join('') : '<li class="muted">No students below threshold.</li>';
  $('#bellDot').hidden = !low.length;
}

/* ---------- students ---------- */
function fillClassSelect(sel, all) {
  const cur = sel.value; sel.innerHTML = (all ? '<option value="">All classes</option>' : '') + D.classes.map(c => `<option>${esc(c.name)}</option>`).join(''); if (cur) sel.value = cur;
}
function renderStudents() {
  fillClassSelect($('#stuClass'), true);
  const q = $('#stuSearch').value.toLowerCase(), cl = $('#stuClass').value;
  const list = D.students.filter(s => (!cl || s.cls === cl) && (`${s.name} ${s.roll} ${s.email}`.toLowerCase().includes(q)));
  $('#stuBody').innerHTML = list.length ? list.map(s => { const p = pct(s), [t, c] = level(p); return `<tr><td>${who(s)}</td><td>${esc(s.roll)}</td><td>${esc(s.cls)}</td><td>${esc(s.dept)}</td><td>${esc(s.email)}</td><td>${p}%</td><td>${badge(t, c)}</td>
   <td><div class="actions"><button class="btn sm" data-view="${s.id}">View</button><button class="btn sm" data-edit="${s.id}">Edit</button><button class="btn sm danger" data-del="${s.id}">Delete</button></div></td></tr>`; }).join('') : '<tr><td colspan="8" class="empty">No students found.</td></tr>';
}
$('#stuSearch').oninput = renderStudents; $('#stuClass').onchange = renderStudents;
$('#stuBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.view) viewStudent(+b.dataset.view);
  if (b.dataset.edit) studentForm(byId(+b.dataset.edit));
  if (b.dataset.del) { const s = byId(+b.dataset.del); if (confirm(`Delete ${s.name}?`)) { D.students = D.students.filter(x => x.id !== s.id); renderStudents(); toast('Student deleted'); } }
});
$('#addStudentBtn').onclick = () => studentForm();
$('#globalSearch').addEventListener('keydown', e => { if (e.key === 'Enter') { go('students'); $('#stuSearch').value = e.target.value; renderStudents(); } });

function field(id, label, val = '', type = 'text') { return `<label>${label}<input id="f_${id}" type="${type}" value="${esc(val)}" required></label>`; }
function selectField(id, label, opts, val) { return `<label>${label}<select id="f_${id}">${opts.map(o => `<option ${o === val ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`; }
function openModal(title, html, save) { $('#modalTitle').textContent = title; $('#modalFields').innerHTML = html; onSave = save; $('#modalBg').hidden = false; }
function closeModal() { $('#modalBg').hidden = true; }
$('#modalClose').onclick = $('#modalCancel').onclick = closeModal;
$('#modalForm').onsubmit = e => { e.preventDefault(); if (onSave() !== false) closeModal(); };
const val = id => $('#f_' + id).value.trim();

function studentForm(s) {
  const depts = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical'];
  openModal(s ? 'Edit Student' : 'Add Student',
    field('name', 'Student name', s?.name) + field('roll', 'Roll number', s?.roll) + field('email', 'Email', s?.email, 'email') +
    selectField('cls', 'Class', D.classes.map(c => c.name), s?.cls) + selectField('dept', 'Department', depts, s?.dept) + field('phone', 'Phone', s?.phone, 'tel'),
    () => {
      if (D.students.some(x => x.roll === val('roll') && x !== s)) { toast('Roll number already exists', true); return false; }
      const d = { name: val('name'), roll: val('roll'), email: val('email'), cls: val('cls'), dept: val('dept'), phone: val('phone') };
      if (s) Object.assign(s, d); else D.students.push({ id: nextId++, ...d, present: 0, total: 0, history: [], today: { subject: '-', status: 'Absent' } });
      renderStudents(); toast(s ? 'Student updated' : 'Student added');
    });
}

/* ---------- student profile ---------- */
function viewStudent(id) {
  viewId = id; const s = byId(id), p = pct(s), [t, c] = level(p);
  const absent = s.history.filter(h => h.status === 'Absent').length, late = s.history.filter(h => h.status === 'Late').length;
  $('#profileBox').innerHTML = `<div class="card" style="margin-top:16px"><div class="profile-head"><span class="avatar lg">${initials(s.name)}</span>
   <div><h2>${esc(s.name)}</h2><span class="muted">${esc(s.roll)} &middot; ${esc(s.cls)}</span> ${badge(t, c)}</div></div>
   <div class="info"><div><small>Roll number</small>${esc(s.roll)}</div><div><small>Class</small>${esc(s.cls)}</div><div><small>Department</small>${esc(s.dept)}</div><div><small>Email</small>${esc(s.email)}</div><div><small>Phone</small>${esc(s.phone)}</div><div><small>Overall attendance</small><b>${p}%</b></div></div></div>
   <div class="grid-2"><div class="card"><h3>Attendance summary</h3><b style="font-size:28px">${p}%</b>
    <div class="progress"><i class="fill-${c}" style="width:${p}%"></i></div>
    <div class="info"><div><small>Classes attended</small>${s.present}</div><div><small>Total classes</small>${s.total}</div><div><small>Recent absences</small>${absent}</div><div><small>Recent late</small>${late}</div></div>
    ${p < threshold ? '<div class="warnbox">Attendance below required threshold.</div>' : ''}</div>
   <div class="card"><h3>Attendance history</h3><div class="table-wrap"><table><thead><tr><th>Date</th><th>Subject</th><th>Status</th></tr></thead><tbody>
   ${s.history.length ? s.history.map(h => `<tr><td>${h.date}</td><td>${esc(h.subject)}</td><td>${badge(h.status)}</td></tr>`).join('') : '<tr><td colspan="3" class="empty">No records yet.</td></tr>'}</tbody></table></div></div></div>`;
  go('profile');
}
$('#backBtn').onclick = () => go('students');

/* ---------- attendance ---------- */
let marks = {};
function renderAttendance() {
  fillClassSelect($('#attClass'));
  const sub = $('#attSubject'), cur = sub.value;
  const subs = D.subjects.filter(x => x.cls === $('#attClass').value); sub.innerHTML = (subs.length ? subs : D.subjects).map(x => `<option>${esc(x.name)}</option>`).join(''); if (cur && [...sub.options].some(o => o.value === cur)) sub.value = cur;
  if (!$('#attDate').value) $('#attDate').value = new Date().toISOString().slice(0, 10);
  drawAttendance();
}
function drawAttendance() {
  const list = D.students.filter(s => s.cls === $('#attClass').value);
  $('#attBody').innerHTML = list.length ? list.map(s => { const m = marks[s.id] || 'Present';
    return `<tr><td>${esc(s.roll)}</td><td>${who(s)}</td>` + ['Present', 'Absent', 'Late'].map(k => `<td><input class="radio" type="radio" name="m${s.id}" value="${k}" data-id="${s.id}" ${m === k ? 'checked' : ''}></td>`).join('') + `<td>${badge(pct(s) + '%', level(pct(s))[1])}</td></tr>`; }).join('') : '<tr><td colspan="6" class="empty">No students in this class.</td></tr>';
}
$('#attClass').onchange = () => { marks = {}; renderAttendance(); };
$('#attBody').addEventListener('change', e => { if (e.target.dataset.id) marks[e.target.dataset.id] = e.target.value; });
$('#markAllBtn').onclick = () => { D.students.filter(s => s.cls === $('#attClass').value).forEach(s => marks[s.id] = 'Present'); drawAttendance(); toast('All students marked present'); };
$('#saveAttBtn').onclick = () => {
  const list = D.students.filter(s => s.cls === $('#attClass').value), subject = $('#attSubject').value, date = $('#attDate').value;
  if (!list.length || !date) return toast('Select a class and date first', true);
  list.forEach(s => { const m = marks[s.id] || 'Present'; s.total++; if (m !== 'Absent') s.present++; s.history.unshift({ date, subject, status: m }); s.today = { subject, status: m }; });
  marks = {}; drawAttendance(); toast(`Attendance saved for ${$('#attClass').value} (${subject})`);
};

/* ---------- reports ---------- */
function subjectStats() {
  return D.subjects.map(sb => { const recs = D.students.flatMap(s => s.history.filter(h => h.subject === sb.name)); const ok = recs.filter(h => h.status !== 'Absent').length; return { name: sb.name, n: recs.length, p: recs.length ? Math.round(ok / recs.length * 100) : 0 }; });
}
function renderReports() {
  const S = D.students, att = S.reduce((a, s) => a + s.present, 0), tot = S.reduce((a, s) => a + s.total, 0);
  $('#repStats').innerHTML = stat('Overall Attendance', avg(S) + '%') + stat('Classes Held', tot ? Math.round(tot / (S.length || 1)) : 0, 'g') + stat('Below Threshold', S.filter(s => pct(s) < threshold).length, 'r') + stat('Students', S.length, 'o');
  const ss = subjectStats(); barChart('#subjChart', ss.map(x => [x.name.split(' ').map(w => w[0]).join(''), x.p]));
  donut('#pvaChart', [{ l: 'Present', v: att, c: '#4f46e5' }, { l: 'Absent', v: tot - att, c: '#dc2626' }]);
  lineChart('#monthTrend', MONTHS);
  $('#classRep').innerHTML = D.classes.map(c => { const l = S.filter(s => s.cls === c.name), a = avg(l); return `<tr><td>${esc(c.name)}</td><td>${l.length}</td><td>${a}%</td><td>${badge(level(a)[0], level(a)[1])}</td></tr>`; }).join('');
  $('#subjRep').innerHTML = ss.map(x => `<tr><td>${esc(x.name)}</td><td>${x.n}</td><td>${x.p}%</td></tr>`).join('');
  $('#stuRep').innerHTML = S.map(s => `<tr><td>${who(s)}</td><td>${esc(s.cls)}</td><td>${s.present}</td><td>${s.total}</td><td>${pct(s)}%</td><td>${badge(level(pct(s))[0], level(pct(s))[1])}</td></tr>`).join('');
}
$('#exportBtn').onclick = () => {
  const rows = [['Roll No', 'Name', 'Class', 'Department', 'Attended', 'Total', 'Attendance %', 'Status']].concat(D.students.map(s => [s.roll, s.name, s.cls, s.dept, s.present, s.total, pct(s), level(pct(s))[0]]));
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'attendance_report.csv'; a.click(); toast('Report exported as CSV');
};

/* ---------- classes & subjects ---------- */
function renderClasses() {
  $('#classBody').innerHTML = D.classes.map((c, i) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.dept)}</td><td>${D.students.filter(s => s.cls === c.name).length}</td><td>${esc(c.faculty)}</td><td><div class="actions"><button class="btn sm" data-k="class" data-e="${i}">Edit</button><button class="btn sm danger" data-k="class" data-d="${i}">Delete</button></div></td></tr>`).join('');
  $('#subjBody').innerHTML = D.subjects.map((x, i) => `<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.cls)}</td><td>${D.students.filter(s => s.cls === x.cls).length}</td><td>${esc(x.faculty)}</td><td><div class="actions"><button class="btn sm" data-k="subject" data-e="${i}">Edit</button><button class="btn sm danger" data-k="subject" data-d="${i}">Delete</button></div></td></tr>`).join('');
}
function crudForm(kind, i) {
  const list = kind === 'class' ? D.classes : D.subjects, o = i !== undefined ? list[i] : null;
  const html = kind === 'class' ? field('name', 'Class name', o?.name) + field('dept', 'Department', o?.dept) + field('faculty', 'Faculty', o?.faculty)
    : field('name', 'Subject name', o?.name) + selectField('cls', 'Class', D.classes.map(c => c.name), o?.cls) + field('faculty', 'Faculty', o?.faculty);
  openModal((o ? 'Edit ' : 'Add ') + kind, html, () => {
    const d = kind === 'class' ? { name: val('name'), dept: val('dept'), faculty: val('faculty') } : { name: val('name'), cls: val('cls'), faculty: val('faculty') };
    if (o) { if (kind === 'class' && o.name !== d.name) { D.students.forEach(s => { if (s.cls === o.name) s.cls = d.name; }); D.subjects.forEach(x => { if (x.cls === o.name) x.cls = d.name; }); } Object.assign(o, d); } else list.push(d);
    renderClasses(); toast(`${kind[0].toUpperCase() + kind.slice(1)} saved`);
  });
}
$('#page-classes').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.add) return crudForm(b.dataset.add);
  const kind = b.dataset.k, list = kind === 'class' ? D.classes : D.subjects;
  if (b.dataset.e !== undefined) crudForm(kind, +b.dataset.e);
  if (b.dataset.d !== undefined && confirm(`Delete this ${kind}?`)) { list.splice(+b.dataset.d, 1); renderClasses(); toast(`${kind} deleted`); }
});

/* ---------- settings ---------- */
$('#saveProfile').onclick = () => toast('Profile updated');
$('#saveNotif').onclick = () => toast('Notification preferences saved');
$('#savePw').onclick = () => {
  if ($('#pwOld').value !== 'admin123') return toast('Current password is incorrect', true);
  if ($('#pwNew').value.length < 6) return toast('New password must be at least 6 characters', true);
  if ($('#pwNew').value !== $('#pwConf').value) return toast('Passwords do not match', true);
  ['#pwOld', '#pwNew', '#pwConf'].forEach(i => $(i).value = ''); toast('Password updated (demo only)');
};
$('#saveThr').onclick = () => { const v = +$('#setThr').value; if (v < 1 || v > 100) return toast('Enter a value between 1 and 100', true); threshold = v; toast(`Threshold set to ${v}%`); };
$('#bellBtn').onclick = () => { const n = D.students.filter(s => pct(s) < threshold).length; toast(n ? `${n} student(s) below ${threshold}% attendance` : 'No new notifications'); };

/* ---------- init ---------- */
fetch('/api/data').then(r => r.json()).then(d => { D = d; go('dashboard'); }).catch(() => toast('Could not load data', true));
