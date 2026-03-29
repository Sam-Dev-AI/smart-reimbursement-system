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
    });
});

// ── Toast ─────────────────────────────────────────────────────
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

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

            // Welcome
            document.getElementById('welcome-text').textContent = `Welcome back, ${(currentUser.fullName || 'Admin').split(' ')[0]}`;
            document.getElementById('company-badge').textContent = currentCompany.name || 'Company';

            // Stats
            document.getElementById('stat-currency').textContent = currentCompany.baseCurrency || '--';

            // Load overview employees
            loadOverviewEmployees();
        }
    } catch (e) {
        console.error('Error loading dashboard:', e);
    }
}

async function loadOverviewEmployees() {
    try {
        const res = await fetch('/api/company/employees');
        const data = await res.json();
        if (data.status === 'success') {
            allEmployees = data.employees;
            document.getElementById('stat-employees').textContent = allEmployees.length;
            document.getElementById('overview-emp-count').textContent = `${allEmployees.length} member${allEmployees.length !== 1 ? 's' : ''}`;

            const tbody = document.getElementById('overview-emp-tbody');
            if (allEmployees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><div class="empty-state-text">No team members yet.</div></div></td></tr>';
                return;
            }
            tbody.innerHTML = allEmployees.slice(0, 5).map(emp => {
                const initials = (emp.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                const sc = emp.status === 'active' ? 'status-active' : 'status-pending';
                return `<tr>
                    <td><div class="table-user"><div class="table-avatar">${initials}</div><div><div class="table-name">${emp.fullName || 'Unknown'}</div><div class="table-email">${emp.email || ''}</div></div></div></td>
                    <td><span style="text-transform:capitalize;font-weight:500">${emp.role}</span></td>
                    <td><span class="status-badge ${sc}">${emp.status || 'pending'}</span></td>
                </tr>`;
            }).join('');
        }
    } catch (e) { console.error(e); }
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
async function loadUsers() {
    try {
        const res = await fetch('/api/company/employees');
        const data = await res.json();
        if (data.status === 'success') {
            allEmployees = data.employees;
            document.getElementById('user-count-label').textContent = `${allEmployees.length} member${allEmployees.length !== 1 ? 's' : ''}`;

            // Populate manager dropdown in add-user form
            const managerSelect = document.getElementById('new-user-manager');
            const autoApproverSelect = document.getElementById('rule-auto-approver');
            const managers = allEmployees.filter(e => e.role === 'manager' || e.role === 'admin');

            managerSelect.innerHTML = '<option value="">-- No Manager --</option>';
            if (autoApproverSelect) autoApproverSelect.innerHTML = '<option value="">-- Select User --</option>';

            managers.forEach(m => {
                managerSelect.innerHTML += `<option value="${m.uid}">${m.fullName} (${m.role})</option>`;
                if (autoApproverSelect) autoApproverSelect.innerHTML += `<option value="${m.uid}">${m.fullName} (${m.role})</option>`;
            });

            // Render table
            const tbody = document.getElementById('user-tbody');
            if (allEmployees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-state-text">No team members. Click "+ Add User" to create one.</div></div></td></tr>';
                return;
            }

            tbody.innerHTML = allEmployees.map(emp => {
                const initials = (emp.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                const sc = emp.status === 'active' ? 'status-active' : 'status-pending';
                const manager = allEmployees.find(e => e.uid === emp.managerId);
                const managerName = manager ? manager.fullName : '<span style="color:var(--gray-500);font-size:11px">Unassigned</span>';

                return `<tr>
                    <td><div class="table-user"><div class="table-avatar">${initials}</div><div><div class="table-name">${emp.fullName || 'Unknown'}</div><div class="table-email">${emp.email || ''}</div></div></div></td>
                    <td><select class="role-select" onchange="updateRole('${emp.uid}', this.value)" ${emp.role === 'admin' ? 'disabled' : ''}>
                        <option value="employee" ${emp.role === 'employee' ? 'selected' : ''}>Employee</option>
                        <option value="manager" ${emp.role === 'manager' ? 'selected' : ''}>Manager</option>
                        <option value="admin" ${emp.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select></td>
                    <td>${managerName}</td>
                    <td><span class="status-badge ${sc}">${emp.status || 'pending'}</span></td>
                    <td>${emp.role !== 'admin' ? `<button class="btn-action btn-action-outline btn-action-sm" onclick="assignManagerPrompt('${emp.uid}')">Assign Mgr</button>` : '<span style="color:var(--gray-500);font-size:11px">Owner</span>'}</td>
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
            document.getElementById('add-user-card').style.display = 'none';
            document.getElementById('add-user-form').reset();
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
    const managers = allEmployees.filter(e => (e.role === 'manager' || e.role === 'admin') && e.uid !== employeeUid);
    if (managers.length === 0) {
        showToast('No managers available. Promote someone to Manager first.');
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

// ── Workflow Builder ──────────────────────────────────────────
let workflowSteps = [];

async function loadWorkflows() {
    try {
        const res = await fetch('/api/workflows');
        const data = await res.json();
        if (data.status === 'success') {
            workflowData = data.workflow;
            workflowSteps = workflowData.steps || [{ role: 'manager', label: 'Direct Manager', description: 'First level approval' }];
            renderWorkflowSteps();
            const toggle = document.getElementById('toggle-manager-first');
            if (workflowData.isManagerFirst !== false) toggle.classList.add('active');
            else toggle.classList.remove('active');
        }
    } catch (e) { console.error(e); }
}

function renderWorkflowSteps() {
    const container = document.getElementById('workflow-steps');
    if (workflowSteps.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-text">No approval steps defined. Add a step to get started.</div></div>';
        return;
    }
    let html = '';
    workflowSteps.forEach((step, i) => {
        if (i > 0) html += '<div class="workflow-connector"></div>';
        html += `<div class="workflow-step">
            <div class="workflow-step-number">${i + 1}</div>
            <div class="workflow-step-content">
                <div class="workflow-step-role">${step.label || step.role}</div>
                <div class="workflow-step-desc">${step.description || ''}</div>
            </div>
            <div class="workflow-step-actions">
                ${i > 0 ? `<button class="btn-action btn-action-outline btn-action-sm" onclick="moveStep(${i}, -1)">Up</button>` : ''}
                ${i < workflowSteps.length - 1 ? `<button class="btn-action btn-action-outline btn-action-sm" onclick="moveStep(${i}, 1)">Dn</button>` : ''}
                <button class="btn-action btn-action-danger btn-action-sm" onclick="removeStep(${i})">X</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

document.getElementById('add-step-btn').addEventListener('click', () => {
    const label = prompt('Step label (e.g., Finance Director, HR Head):');
    if (label) {
        workflowSteps.push({ role: label.toLowerCase().replace(/\s+/g, '_'), label: label, description: 'Custom approval step' });
        renderWorkflowSteps();
    }
});

window.moveStep = function(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= workflowSteps.length) return;
    [workflowSteps[index], workflowSteps[newIndex]] = [workflowSteps[newIndex], workflowSteps[index]];
    renderWorkflowSteps();
};

window.removeStep = function(index) {
    workflowSteps.splice(index, 1);
    renderWorkflowSteps();
};

document.getElementById('save-workflow-btn').addEventListener('click', async () => {
    const isManagerFirst = document.getElementById('toggle-manager-first').classList.contains('active');
    try {
        const res = await fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps: workflowSteps, isManagerFirst })
        });
        const data = await res.json();
        if (data.status === 'success') showToast('Workflow saved');
        else showToast('Error: ' + data.message);
    } catch (e) { showToast('Error saving workflow'); }
});

// ── Advanced Rules ────────────────────────────────────────────
async function loadRules() {
    try {
        const res = await fetch('/api/workflows');
        const data = await res.json();
        if (data.status === 'success' && data.workflow.advancedRules) {
            const rules = data.workflow.advancedRules;
            document.getElementById('rule-percentage').value = rules.percentageRequired || 100;
            document.getElementById('rule-auto-limit').value = rules.autoApproveLimit || 0;
        }
    } catch (e) { console.error(e); }
}

document.getElementById('save-rules-btn').addEventListener('click', async () => {
    const advancedRules = {
        percentageRequired: parseInt(document.getElementById('rule-percentage').value) || 100,
        autoApprover: document.getElementById('rule-auto-approver').value,
        autoApproveLimit: parseFloat(document.getElementById('rule-auto-limit').value) || 0
    };
    try {
        const res = await fetch('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ advancedRules })
        });
        const data = await res.json();
        if (data.status === 'success') showToast('Rules saved');
        else showToast('Error: ' + data.message);
    } catch (e) { showToast('Error saving rules'); }
});

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
                const sc = exp.status === 'approved' ? 'status-active' : exp.status === 'rejected' ? 'status-rejected' : 'status-pending';
                return `<tr>
                    <td>${exp.employeeName || exp.employeeId || '--'}</td>
                    <td>${exp.description || '--'}</td>
                    <td><strong>${currentCompany.baseCurrency || ''} ${exp.amount || 0}</strong></td>
                    <td><span class="status-badge ${sc}">${exp.status || 'pending'}</span></td>
                    <td>
                        ${exp.status === 'pending' ? `
                            <button class="btn-action btn-action-success btn-action-sm" onclick="overrideExpense('${exp.id}','approved')">Approve</button>
                            <button class="btn-action btn-action-danger btn-action-sm" onclick="overrideExpense('${exp.id}','rejected')">Reject</button>
                        ` : '<span style="font-size:11px;color:var(--gray-500)">Resolved</span>'}
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

// ── Threshold Rules (Add Rule) ────────────────────────────────
document.getElementById('add-threshold-btn').addEventListener('click', () => {
    const container = document.getElementById('threshold-rules');
    const id = Date.now();
    const html = `<div class="rule-card" id="rule-${id}">
        <div class="rule-card-header">
            <div class="rule-card-title">Amount Threshold</div>
            <button class="btn-action btn-action-danger btn-action-sm" onclick="document.getElementById('rule-${id}').remove()">Remove</button>
        </div>
        <div class="form-grid">
            <div class="form-group"><label>If amount exceeds</label><input type="number" placeholder="e.g., 50000"></div>
            <div class="form-group"><label>Route to</label><select class="role-select"><option>Finance Director</option><option>CFO</option><option>CEO</option></select></div>
        </div>
    </div>`;
    container.insertAdjacentHTML('beforeend', html);
});

// ── Boot ──────────────────────────────────────────────────────
loadDashboard();
