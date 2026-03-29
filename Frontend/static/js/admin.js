/* ══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — JavaScript Logic
   Handles: Sidebar toggle, section switching, API integration,
   user management, workflow builder, and expense oversight.
   ══════════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────
let currentUser = {};
let currentCompany = {};
let allEmployees = [];
let workflowData = {};

// ── Sidebar Toggle ────────────────────────────────────────────
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');

sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    // Save preference
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
});

// Restore sidebar state
if (localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed');
}

// ── Section Switching ─────────────────────────────────────────
const navItems = document.querySelectorAll('.sidebar-nav-item[data-section]');
const sections = document.querySelectorAll('.dashboard-section');
const pageTitle = document.getElementById('page-title');
const pageBreadcrumb = document.getElementById('page-breadcrumb');

const sectionMeta = {
    overview:  { title: 'Dashboard',            breadcrumb: 'Admin Panel / Overview' },
    company:   { title: 'Company & Currency',    breadcrumb: 'Admin Panel / Company Profile' },
    users:     { title: 'Users & Teams',         breadcrumb: 'Admin Panel / Team Management' },
    workflows: { title: 'Approval Workflows',    breadcrumb: 'Admin Panel / Workflow Config' },
    rules:     { title: 'Advanced Rules',        breadcrumb: 'Admin Panel / Rule Engine' },
    expenses:  { title: 'All Expenses',          breadcrumb: 'Admin Panel / Global Oversight' }
};

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.dataset.section;

        // Update nav active
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // Switch section
        sections.forEach(s => s.classList.remove('active'));
        document.getElementById(`section-${target}`).classList.add('active');

        // Update top bar
        const meta = sectionMeta[target] || {};
        pageTitle.textContent = meta.title || 'Dashboard';
        pageBreadcrumb.textContent = meta.breadcrumb || '';

        // Load section-specific data
        if (target === 'users') loadUsers();
        if (target === 'workflows') loadWorkflows();
        if (target === 'rules') loadRules();
        if (target === 'expenses') loadExpenses();
        if (target === 'company') loadCompanyProfile();
        if (target === 'hierarchy') loadHierarchy();
    });
});

// ── Toast ─────────────────────────────────────────────────────
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── Hierarchy Search Logic ────────────────────────────────────
function resetHierarchyHighlights() {
    document.querySelectorAll('.org-node').forEach(n => n.classList.remove('search-match'));
    document.querySelectorAll('#hierarchy-svg path').forEach(p => p.classList.remove('high-visibility'));
}

function searchOrgHierarchy(query) {
    if (!query) {
        resetHierarchyHighlights();
        return;
    }

    const matches = allEmployees.filter(e => e.fullName.toLowerCase().includes(query.toLowerCase()));
    if (matches.length > 0) {
        resetHierarchyHighlights();
        const first = matches[0];
        
        // Highlight Match
        const node = document.getElementById(`node-${first.uid}`);
        if (node) {
            node.classList.add('search-match');
            
            // Trace path to root
            traceReportingLine(first.uid);
            
            // Ensure paths are perfectly aligned with the highlight
            updateNodePaths(first.uid);
            
            // Center View!
            const nx = parseFloat(node.style.left);
            const ny = parseFloat(node.style.top);
            
            hPanX = (hViewport.clientWidth / 2) - (nx * hZoom);
            hPanY = (hViewport.clientHeight / 2) - (ny * hZoom);
            updateHierarchyTransform();
        }
    }
}

function traceReportingLine(uid) {
    const emp = allEmployees.find(e => e.uid === uid);
    if (!emp || !emp.managerId) return;

    const path = document.querySelector(`path[data-target="${uid}"]`);
    if (path) {
        path.classList.add('high-visibility');
        // Recursively trace the manager's line
        traceReportingLine(emp.managerId);
    }
}

// ── Search Listeners ──────────────────────────────────────────
const searchOverview = document.getElementById('search-overview');
if (searchOverview) {
    searchOverview.addEventListener('input', (e) => loadOverviewEmployees(e.target.value));
}

const searchUsersTable = document.getElementById('search-users');
if (searchUsersTable) {
    searchUsersTable.addEventListener('input', (e) => loadUsers(e.target.value));
}

const searchHierarchyInput = document.getElementById('search-hierarchy');
if (searchHierarchyInput) {
    searchHierarchyInput.addEventListener('input', (e) => searchOrgHierarchy(e.target.value));
}

// ── Initialize Dashboard ──────────────────────────────────────
loadDashboard();

// ── Load Dashboard Data ───────────────────────────────────────
async function loadDashboard() {
    try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        if (data.status === 'success') {
            currentUser = data.user;
            currentCompany = data.company;

            // Sidebar user
            const initials = (currentUser.fullName || 'A').split(' ').map(n => n[0]).join('').toUpperCase();
            document.getElementById('user-avatar').textContent = initials;
            document.getElementById('user-name').textContent = currentUser.fullName || 'Admin';
            document.getElementById('user-role').textContent = currentUser.role || 'admin';

            // Welcome (Safety Checks Added)
            const welcomeText = document.getElementById('welcome-text');
            const companyBadge = document.getElementById('company-badge');
            if (welcomeText) welcomeText.textContent = `Welcome back, ${(currentUser.fullName || 'Admin').split(' ')[0]}`;
            if (companyBadge) companyBadge.textContent = currentCompany.name || 'Company';

            // Load overview employees and activity (Properly awaited)
            await loadOverviewEmployees();
            await loadRecentActivity();
        }
    } catch (e) {
        console.error('Error loading dashboard:', e);
    }
}

// ── Activity Helper ──────────────────────────────────────────
function formatTime(timestamp) {
    if (!timestamp) return 'Recently';
    
    let date;
    if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
    } else {
        date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

async function loadRecentActivity() {
    const list = document.getElementById('recent-activity-list');
    if (!list) return;

    try {
        const [empRes, expRes] = await Promise.all([
            fetch('/api/company/employees'),
            fetch('/api/expenses/all')
        ]);
        
        const empData = await empRes.json();
        const expData = await expRes.json();

        let activities = [];

        if (empData.status === 'success') {
            empData.employees.forEach(u => {
                const date = u.createdAt ? (typeof u.createdAt === 'string' ? new Date(u.createdAt) : new Date(u.createdAt._seconds * 1000)) : new Date();
                activities.push({
                    text: `${u.fullName} joined as ${u.role.charAt(0).toUpperCase() + u.role.slice(1)}`,
                    time: u.createdAt,
                    color: 'blue',
                    rawTime: date.getTime()
                });
            });
        }

        if (expData.status === 'success') {
            expData.expenses.forEach(e => {
                const date = e.createdAt ? (typeof e.createdAt === 'string' ? new Date(e.createdAt) : new Date(e.createdAt._seconds * 1000)) : new Date();
                activities.push({
                    text: `${e.employeeName || 'Member'} submitted ${e.currency} ${e.amount}`,
                    time: e.createdAt,
                    color: 'green',
                    rawTime: date.getTime()
                });

                if (e.status !== 'pending') {
                    const updateDate = (e.lastUpdatedAt || e.createdAt) ? (typeof (e.lastUpdatedAt || e.createdAt) === 'string' ? new Date(e.lastUpdatedAt || e.createdAt) : new Date((e.lastUpdatedAt || e.createdAt)._seconds * 1000)) : new Date();
                    activities.push({
                        text: `Expense #${e.id.slice(-4)} was ${e.status}`,
                        time: e.lastUpdatedAt || e.createdAt,
                        color: e.status === 'approved' ? 'green' : 'red',
                        rawTime: updateDate.getTime()
                    });
                }
            });
        }

        activities.sort((a, b) => b.rawTime - a.rawTime);

        if (activities.length === 0) {
            list.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }

        list.innerHTML = activities.slice(0, 5).map(act => `
            <div class="activity-item">
                <div class="activity-dot activity-dot-${act.color}"></div>
                <div>
                    <div class="activity-text">${act.text}</div>
                    <div class="activity-time">${formatTime(act.time)}</div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error('Activity load error:', e);
        list.innerHTML = '<div class="activity-text" style="padding:16px;color:#991b1b">Error loading feed</div>';
    }
}

async function loadOverviewEmployees(filter = '') {
    try {
        const res = await fetch('/api/company/employees');
        const data = await res.json();
        if (data.status === 'success') {
            allEmployees = data.employees;
            
            // Calculate role-specific stats (EXCLUDE ADMIN - Case Insensitive)
            const teamMembers = allEmployees.filter(e => e.role.toLowerCase() !== 'admin');
            const totalEmployees = teamMembers.filter(e => e.role.toLowerCase() === 'employee').length;
            const totalManagers = teamMembers.filter(e => e.role.toLowerCase() === 'manager').length;
            const totalFinance = teamMembers.filter(e => e.role.toLowerCase() === 'finance').length;
            const totalPending = teamMembers.filter(e => e.status === 'pending').length;

            // Update UI Stats
            if (document.getElementById('stat-employees')) document.getElementById('stat-employees').textContent = totalEmployees;
            if (document.getElementById('stat-managers')) document.getElementById('stat-managers').textContent = totalManagers;
            if (document.getElementById('stat-finance')) document.getElementById('stat-finance').textContent = totalFinance;
            if (document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = totalPending;
            
            const countLabel = document.getElementById('overview-emp-count');
            if (countLabel) countLabel.textContent = `${teamMembers.length} member${teamMembers.length !== 1 ? 's' : ''}`;

            // Apply filter if any
            const filtered = filter 
                ? teamMembers.filter(e => e.fullName.toLowerCase().includes(filter.toLowerCase()) || e.email.toLowerCase().includes(filter.toLowerCase()))
                : teamMembers.slice(0, 5); // Limit overview to 5 if no search

            const tbody = document.getElementById('overview-emp-tbody');
            if (!tbody) return;

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3"><div class="empty-state"><div class="empty-state-text">No matches for "${filter}"</div></div></td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(emp => {
                const initials = (emp.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                const sc = emp.status === 'active' ? 'status-active' : 'status-pending';
                return `<tr>
                    <td><div class="table-user"><div class="table-avatar">${initials}</div><div><div class="table-name">${emp.fullName || 'Unknown'}</div><div class="table-email">${emp.email || ''}</div></div></div></td>
                    <td><span style="text-transform:capitalize;font-weight:500">${emp.role}</span></td>
                    <td><span class="status-badge ${sc}">${emp.status || 'pending'}</span></td>
                </tr>`;
            }).join('');
        }
    } catch (e) { console.error('Overview employees load error:', e); }
}

// ── Company Profile ───────────────────────────────────────────
function loadCompanyProfile() {
    document.getElementById('company-name').textContent = currentCompany.name || '--';
    document.getElementById('company-country').textContent = currentCompany.country || '--';
    document.getElementById('company-currency').textContent = currentCompany.baseCurrency || '--';
    document.getElementById('company-admin').textContent = currentUser.fullName || '--';
    document.getElementById('currency-display').textContent = currentCompany.baseCurrency || '--';
}

// ── User Management ───────────────────────────────────────────
async function loadUsers(filter = '') {
    try {
        const res = await fetch('/api/company/employees');
        const data = await res.json();
        if (data.status === 'success') {
            allEmployees = data.employees;
            const teamMembers = allEmployees.filter(e => e.role !== 'admin');
            
            const filtered = filter 
                ? teamMembers.filter(e => e.fullName.toLowerCase().includes(filter.toLowerCase()) || e.email.toLowerCase().includes(filter.toLowerCase()))
                : teamMembers;

            const label = document.getElementById('user-count-label');
            if (label) label.textContent = `${filtered.length} member${filtered.length !== 1 ? 's' : ''}`;

            const managerSelect = document.getElementById('new-user-manager');
            const managers = allEmployees.filter(e => ['manager', 'finance', 'admin'].includes(e.role));
            if (managerSelect && managerSelect.options.length <= 1) {
                managerSelect.innerHTML = '<option value="">-- No Manager --</option>' + 
                    managers.map(m => `<option value="${m.uid}">${m.fullName} (${m.role})</option>`).join('');
            }

            const tbody = document.getElementById('user-tbody');
            if (!tbody) return;

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-text">${filter ? `No users found matching "${filter}"` : 'No team members.'}</div></div></td></tr>`;
                return;
            }

            tbody.innerHTML = filtered.map(emp => {
                const initials = (emp.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                const sc = emp.status === 'active' ? 'status-active' : 'status-pending';
                const manager = allEmployees.find(e => e.uid === emp.managerId);
                const managerName = manager ? manager.fullName : '<span style="color:var(--gray-400);font-size:11px">Unassigned</span>';

                return `<tr>
                    <td><div class="table-user"><div class="table-avatar">${initials}</div><div><div class="table-name">${emp.fullName || 'Unknown'}</div><div class="table-email">${emp.email || ''}</div></div></div></td>
                    <td><select class="role-select" onchange="updateRole('${emp.uid}', this.value)" ${emp.role === 'admin' ? 'disabled' : ''}>
                        <option value="employee" ${emp.role === 'employee' ? 'selected' : ''}>Employee</option>
                        <option value="manager" ${emp.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="finance" ${emp.role === 'finance' ? 'selected' : ''}>Finance</option>
                        <option value="admin" ${emp.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select></td>
                    <td>${managerName}</td>
                    <td><span class="status-badge ${sc}">${emp.status || 'pending'}</span></td>
                    <td><button class="btn-action btn-action-outline btn-action-sm" onclick="assignManagerPrompt('${emp.uid}')">Assign Mgr</button></td>
                </tr>`;
            }).join('');
        }
    } catch (e) { console.error(e); }
}

// Add User Form
document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        fullName: document.getElementById('new-user-name').value,
        email: document.getElementById('new-user-email').value,
        role: document.getElementById('new-user-role').value,
        password: document.getElementById('new-user-pass').value || 'Welcome@123',
        managerId: document.getElementById('new-user-manager').value
    };

    try {
        const res = await fetch('/api/user/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast('User created successfully');
            
            // QUICK ADD: Preserving manager selection
            const currentManager = document.getElementById('new-user-manager').value;
            document.getElementById('add-user-form').reset();
            document.getElementById('new-user-manager').value = currentManager;
            
            // document.getElementById('add-user-card').style.display = 'none'; // Keep open for quick add
            loadUsers();
            loadOverviewEmployees();
        } else {
            showToast('Error: ' + data.message);
        }
    } catch (e) {
        showToast('Error creating user');
    }
});

// Update Role
window.updateRole = async function(uid, role) {
    try {
        const res = await fetch('/api/employee/role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, role })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`Role updated to ${role}`);
            loadUsers();
        } else {
            showToast('Error: ' + data.message);
        }
    } catch (e) {
        showToast('Error updating role');
    }
};

// Assign Manager
window.assignManagerPrompt = function(employeeUid) {
    const managers = allEmployees.filter(e => ['manager', 'finance', 'admin'].includes(e.role) && e.uid !== employeeUid);
    if (managers.length === 0) {
        showToast('No approvers available. Promote someone to Manager/Finance first.');
        return;
    }
    const list = managers.map((m, i) => `${i + 1}. ${m.fullName} (${m.role})`).join('\n');
    const choice = prompt(`Select manager number:\n${list}`);
    if (choice) {
        const idx = parseInt(choice) - 1;
        if (managers[idx]) {
            assignManager(employeeUid, managers[idx].uid);
        }
    }
};

async function assignManager(empUid, mgrUid) {
    try {
        const res = await fetch('/api/user/assign-manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeUid: empUid, managerUid: mgrUid })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast('Manager assigned');
            loadUsers();
        }
    } catch (e) { showToast('Error assigning manager'); }
}

// ── Enterprise Workflow Engine (Threshold Logic) ───────────────────
async function loadWorkflows() {
    try {
        const res = await fetch('/api/workflows');
        const data = await res.json();
        
        let workflowData = {};
        if (data && data.status === 'success') {
            workflowData = data.workflow || {};
        }

        const thresholdInput = document.getElementById('finance-threshold-input');
        if (thresholdInput) {
            // Default to 0 (always escalate) if not set
            thresholdInput.value = workflowData.financeThreshold ?? 0; 
        }

        // Dynamically update currency labels based on company config
        const baseCurLabels = document.querySelectorAll('.admin-base-currency-label');
        baseCurLabels.forEach(label => {
            const cur = currentCompany?.baseCurrency;
            let sym = '₹';
            if (cur === 'USD' || cur === 'CAD' || cur === 'AUD') sym = '$';
            else if (cur === 'EUR') sym = '€';
            else if (cur === 'GBP') sym = '£';
            else if (cur === 'AED') sym = 'د.إ';
            else if (cur) sym = cur;

            label.textContent = sym;
        });

        // Just calling loadRules() to fulfill legacy code dependencies if needed
        loadRules(workflowData);
        
    } catch (e) {
        console.error('Workflow system error:', e);
    }
}

document.getElementById('save-workflow-btn')?.addEventListener('click', async () => {
    const thresholdInput = document.getElementById('finance-threshold-input');
    const percInput = document.getElementById('rule-percentage');
    const approverSelect = document.getElementById('rule-auto-approver');
    const limitInput = document.getElementById('rule-auto-limit');

    const financeThreshold = thresholdInput ? (parseFloat(thresholdInput.value) || 0) : 0;
    
    const advancedRules = {
        percentageRequired: percInput ? (parseInt(percInput.value) || 100) : 100,
        autoApprover: approverSelect ? approverSelect.value : '',
        autoApproveLimit: limitInput ? (parseFloat(limitInput.value) || 0) : 0
    };

    try {
        const res = await fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ financeThreshold, advancedRules })
        });
        const data = await res.json();
        if (data.status === 'success') showToast('Enterprise workflow settings saved!');
        else showToast('Error: ' + data.message);
    } catch (e) { 
        showToast('Error saving workflow configuration'); 
    }
});

// ── Advanced Rules (Legacy Stub for auto-approvers) ───────────
async function loadRules(workflowData) {
    try {
        workflowData = workflowData || {};
        const rules = workflowData.advancedRules || {};
        
        const percInput = document.getElementById('rule-percentage');
        const limitInput = document.getElementById('rule-auto-limit');
        const approverSelect = document.getElementById('rule-auto-approver');
        
        if (percInput) percInput.value = rules.percentageRequired || 100;
        if (limitInput) limitInput.value = rules.autoApproveLimit || 0;
        
        // Ensure the Auto-Approver dropdown is synced with existing selection
        if (approverSelect) {
            // Repopulate with current managers/finance if list empty
            if (approverSelect.options.length <= 1 && allEmployees.length > 0) {
                approverSelect.innerHTML = '<option value="">-- Select Authority --</option>';
                const approvers = allEmployees.filter(e => e.role && ['manager', 'finance', 'admin'].includes(e.role.toLowerCase()));
                approvers.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.uid;
                    opt.textContent = `${m.fullName} (${m.role})`;
                    approverSelect.appendChild(opt);
                });
            }
            if (rules.autoApprover) approverSelect.value = rules.autoApprover;
        }
    } catch (e) { 
        console.error('Advanced rules system error:', e);
    }
}


// ── Expense Oversight ─────────────────────────────────────────
async function loadExpenses() {
    try {
        const res = await fetch('/api/expenses/all');
        const data = await res.json();
        if (data.status === 'success') {
            const expenses = data.expenses;
            document.getElementById('expense-count-label').textContent = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`;
            const tbody = document.getElementById('expense-tbody');
            if (expenses.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-state-text">No expenses have been submitted yet.</div></div></td></tr>';
                return;
            }
            tbody.innerHTML = expenses.map(exp => {
                const status = exp.status || 'pending';
                let sc = 'status-pending';
                if (status === 'approved') sc = 'status-active';
                else if (status === 'rejected') sc = 'status-rejected';
                else if (status.startsWith('pending_')) sc = 'status-pending';

                const isActionable = status === 'pending' || status === 'pending_manager' || status === 'pending_finance';

                return `<tr>
                    <td>${exp.employeeName || exp.employeeId || '--'}</td>
                    <td>${exp.description || '--'}</td>
                    <td><strong>${currentCompany.baseCurrency || ''} ${exp.amount || 0}</strong></td>
                    <td><span class="status-badge ${sc}">${status.replace('_', ' ')}</span></td>
                    <td>
                        ${isActionable ? `
                            <button class="btn-action btn-action-success btn-action-sm" onclick="overrideExpense('${exp.id}','approved')">Approve</button>
                            <button class="btn-action btn-action-danger btn-action-sm" onclick="overrideExpense('${exp.id}','rejected')">Reject</button>
                        ` : `<span style="font-size:11px;color:var(--gray-500)">Resolved (${status})</span>`}
                    </td>
                </tr>`;
            }).join('');
        }
    } catch (e) { console.error(e); }
}

window.overrideExpense = async function(expenseId, action) {
    try {
        const res = await fetch('/api/expenses/override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expenseId, action })
        });
        const data = await res.json();
        if (data.status === 'success') {
            showToast(`Expense ${action}`);
            loadExpenses();
        }
    } catch (e) { showToast('Error overriding expense'); }
};



// ── Interactive Org Hierarchy ──────────────────────────────
let hZoom = 1;
let hPanX = 50; // Initial center offset
let hPanY = 50;
let isDragging = false;
let startX, startY;

const hViewport = document.getElementById('hierarchy-viewport');
const hCanvas = document.getElementById('hierarchy-canvas');
const hStage = document.getElementById('hierarchy-stage');
const hSvg = document.getElementById('hierarchy-svg');
const zLevel = document.getElementById('zoom-level');

// Node Drag State
let draggedNode = null;
let nodeStartX, nodeStartY;
let mouseStartX, mouseStartY;

if (hViewport) {
    hViewport.addEventListener('mousedown', (e) => {
        const nodeEl = e.target.closest('.org-node');
        if (nodeEl) {
            // Node Drag Start
            draggedNode = nodeEl;
            isDragging = false; // Disable canvas pan
            
            const rect = nodeEl.getBoundingClientRect();
            nodeStartX = parseFloat(nodeEl.style.left);
            nodeStartY = parseFloat(nodeEl.style.top);
            mouseStartX = e.clientX;
            mouseStartY = e.clientY;
            
            nodeEl.style.zIndex = '1000';
            nodeEl.style.cursor = 'grabbing';
            return;
        }

        // Canvas Pan Start
        isDragging = true;
        startX = e.clientX - hPanX;
        startY = e.clientY - hPanY;
        hViewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (draggedNode) {
            // Node Dragging
            const dx = (e.clientX - mouseStartX) / hZoom;
            const dy = (e.clientY - mouseStartY) / hZoom;
            
            const newX = nodeStartX + dx;
            const newY = nodeStartY + dy;
            
            draggedNode.style.left = `${newX}px`;
            draggedNode.style.top = `${newY}px`;
            
            // Update Connectors
            updateNodePaths(draggedNode.dataset.uid);
            return;
        }

        if (!isDragging) return;
        hPanX = e.clientX - startX;
        hPanY = e.clientY - startY;
        updateHierarchyTransform();
    });

    window.addEventListener('mouseup', () => {
        if (draggedNode) {
            draggedNode.style.zIndex = '50';
            draggedNode.style.cursor = 'grab';
            draggedNode = null;
        }
        isDragging = false;
        if(hViewport) hViewport.style.cursor = 'grab';
    });

    hViewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        hZoom = Math.min(Math.max(0.2, hZoom + delta), 2);
        updateHierarchyTransform();
    }, { passive: false });
}

function updateHierarchyTransform() {
    if (!hCanvas) return;
    hCanvas.style.transform = `translate(${hPanX}px, ${hPanY}px) scale(${hZoom})`;
    if (zLevel) zLevel.textContent = `${Math.round(hZoom * 100)}%`;
}

window.resetHierarchyView = function() {
    hZoom = 0.8;
    hPanX = 100;
    hPanY = 50;
    updateHierarchyTransform();
};

async function loadHierarchy() {
    try {
        const res = await fetch('/api/company/employees');
        const data = await res.json();
        if (data.status === 'success') {
            allEmployees = data.employees;
            renderOrgTree();
        }
    } catch (e) { console.error('Error loading hierarchy:', e); }
}

function renderOrgTree() {
    if (!hStage) return;
    hStage.innerHTML = '';
    hSvg.innerHTML = '';
    
    // 1. Build hierarchy object
    // Find all users who do NOT have a manager assigned
    const rootUsers = allEmployees.filter(e => !e.managerId);
    
    if (rootUsers.length === 0 && allEmployees.length > 0) {
        // Fallback if there's a circular dependency or everyone has a manager (rare)
        rootUsers.push(allEmployees[0]);
    } else if (rootUsers.length === 0) {
        hStage.innerHTML = '<div class="empty-state">No Organization Data</div>';
        return;
    }

    // Attach all unassigned users to a virtual root node so nobody is dropped
    const structure = {
        uid: 'virtual_root',
        fullName: 'Executive Board',
        role: 'admin',
        children: rootUsers.map(u => buildTree(u.uid, allEmployees))
    };
    
    // 2. Position nodes (Professional Hybrid Layout)
    const nodeWidth = 240;
    const nodeHeight = 100;
    const horizontalGap = 120; // More space for managers to breathe
    const verticalGap = 180;
    const stackIndent = 50;  // Indent for vertical stacks
    const stackGap = 120;    // Gap between vertically stacked employees
    
    // Width calculation logic
    function precalculateWidths(item) {
        // Employees under managers will be stacked vertically
        if (item.role === 'manager') {
            item.layout = 'vertical';
            item.totalWidth = nodeWidth + horizontalGap;
            // Total height of the stack for this subtree
            item.totalHeight = nodeHeight + (item.children.length * stackGap);
            return item.totalWidth;
        }

        if (!item.children || item.children.length === 0) {
            item.totalWidth = nodeWidth + horizontalGap;
            item.totalHeight = nodeHeight;
            return item.totalWidth;
        }

        let w = 0;
        item.children.forEach(child => {
            w += precalculateWidths(child);
        });
        item.totalWidth = Math.max(nodeWidth + horizontalGap, w);
        return item.totalWidth;
    }

    precalculateWidths(structure);

    function positionNodes(item, x, y, isStacked = false) {
        if (!item) return;

        // Positioning logic
        let cardX, cardY;
        if (isStacked) {
            cardX = x;
            cardY = y;
        } else {
            cardX = x + (item.totalWidth / 2) - (nodeWidth / 2);
            cardY = y;
        }

        const initials = (item.fullName || 'U').split(' ').map(s => s[0]).join('').toUpperCase();
        const roleClass = item.role === 'admin' ? 'badge-node-admin' : item.role === 'manager' ? 'badge-node-manager' : 'badge-node-employee';
        
        const card = document.createElement('div');
        card.className = 'org-node';
        card.id = `node-${item.uid}`;
        card.dataset.uid = item.uid;
        card.style.left = `${cardX}px`;
        card.style.top = `${cardY}px`;
        card.innerHTML = `
            <div class="org-node-header">
                <div class="org-node-avatar">${initials}</div>
                <div>
                    <div class="org-node-name" style="font-weight: 600; font-size: 0.95rem;">${item.fullName}</div>
                    <div class="org-node-role" style="text-transform: uppercase; font-size: 0.7rem; color: #64748b; letter-spacing: 0.5px;">${item.role}</div>
                </div>
            </div>
            <div class="org-node-badge-container" style="margin-top: 10px;">
                <span class="badge ${roleClass}" style="font-size: 0.65rem; padding: 4px 8px;">
                    ${item.role.toUpperCase()}
                </span>
            </div>
        `;
        hStage.appendChild(card);

        if (item.children && item.children.length > 0) {
            if (item.role === 'manager') {
                // Vertical Stack
                let currentY = y + verticalGap;
                item.children.forEach((child, i) => {
                    const childX = cardX + stackIndent;
                    const childY = currentY;

                    // Connector for vertical stack (L-shaped or S-curve)
                    drawPath(cardX + 40, y + nodeHeight, childX + nodeWidth/2, childY, item.uid, child.uid);
                    
                    positionNodes(child, childX, childY, true);
                    currentY += stackGap;
                });
            } else {
                // Horizontal Layout
                let currentX = x;
                item.children.forEach(child => {
                    const childY = y + verticalGap;
                    const childSubtreeWidth = child.totalWidth;
                    
                    const parentCenterX = cardX + nodeWidth/2;
                    const childCenterX = currentX + (childSubtreeWidth / 2);

                    drawPath(parentCenterX, y + nodeHeight, childCenterX, childY, item.uid, child.uid);
                    
                    positionNodes(child, currentX, childY, false);
                    currentX += childSubtreeWidth;
                });
            }
        }
    }

    // Centered start point
    positionNodes(structure, 0, 50);

    // 4. Center View on the Organization Root
    const totalTreeWidth = structure.totalWidth;
    hPanX = (hViewport.clientWidth / 2) - (totalTreeWidth / 2);
    hPanY = 80;
    hZoom = 0.8;
    updateHierarchyTransform();
}

function buildTree(uid, list) {
    const user = list.find(u => u.uid === uid);
    if (!user) return null;
    
    return {
        ...user,
        children: list.filter(u => u.managerId === uid).map(c => buildTree(c.uid, list))
    };
}

function drawPath(x1, y1, x2, y2, sUid, tUid) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("data-source", sUid);
    path.setAttribute("data-target", tUid);
    
    // S-curve connector
    const midY = (y1 + y2) / 2;
    const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    
    path.setAttribute("d", d);
    hSvg.appendChild(path);
}

function updateNodePaths(uid) {
    if (!hSvg) return;
    
    const nodeEl = document.querySelector(`.org-node[data-uid="${uid}"]`);
    if (!nodeEl) return;
    
    const nW = 240; // Card width
    const nH = 100; // Card height
    
    const x = parseFloat(nodeEl.style.left);
    const y = parseFloat(nodeEl.style.top);
    const centerX = x + nW / 2;
    const bottomY = y + nH;
    const topY = y;

    // 1. Update lines leading OUT of this node (to children)
    const outPaths = hSvg.querySelectorAll(`path[data-source="${uid}"]`);
    outPaths.forEach(p => {
        const targetUid = p.getAttribute('data-target');
        const targetEl = document.querySelector(`.org-node[data-uid="${targetUid}"]`);
        if (targetEl) {
            const tx = parseFloat(targetEl.style.left) + nW/2;
            const ty = parseFloat(targetEl.style.top);
            const midY = (bottomY + ty) / 2;
            p.setAttribute("d", `M ${centerX} ${bottomY} C ${centerX} ${midY}, ${tx} ${midY}, ${tx} ${ty}`);
        }
    });

    // 2. Update lines leading INTO this node (from parent)
    const inPaths = hSvg.querySelectorAll(`path[data-target="${uid}"]`);
    inPaths.forEach(p => {
        const sourceUid = p.getAttribute('data-source');
        const sourceEl = document.querySelector(`.org-node[data-uid="${sourceUid}"]`);
        if (sourceEl) {
            const sx = parseFloat(sourceEl.style.left) + nW/2;
            const sy = parseFloat(sourceEl.style.top) + nH;
            const midY = (sy + topY) / 2;
            p.setAttribute("d", `M ${sx} ${sy} C ${sx} ${midY}, ${centerX} ${midY}, ${centerX} ${topY}`);
        }
    });
}

// ── Boot ──────────────────────────────────────────────────────
loadDashboard();
