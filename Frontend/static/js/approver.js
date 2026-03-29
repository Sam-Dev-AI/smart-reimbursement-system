/* ══════════════════════════════════════════════════════════════
   APPROVER DASHBOARD — JavaScript Logic
   SPA Implementation: Handles Overview, Approvals, Team, and Profile
   ══════════════════════════════════════════════════════════════ */

let currentUser = {};
let pendingExpenses = [];
let teamMembers = [];
let teamExpenses = [];

// ── Sidebar Logic ─────────────────────────────────────────────
function initSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });

        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    // Nav Items
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            if (section) switchSection(section);
        });
    });
}

// ── Section Switching ──────────────────────────────────────────
window.switchSection = function(sectionId) {
    console.log('[SPA] Switching to section:', sectionId);
    
    // 1. Update UI classes (using 'active' as defined in dashboard.css)
    document.querySelectorAll('.dashboard-section').forEach(s => {
        s.classList.remove('active');
        // Also remove d-none if it somehow got back in
        s.classList.remove('d-none');
    });
    
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.classList.add('active');
        console.log(`[SPA] Section 'section-${sectionId}' is now active`);
    } else {
        console.warn(`[SPA] Section 'section-${sectionId}' NOT FOUND in DOM`);
    }

    // 2. Sidebar active state
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-section') === sectionId);
    });

    // 3. Update Titles & Breadcrumbs
    const titles = {
        overview: 'Dashboard',
        approvals: 'Approval Queue',
        team: 'My Team',
        reports: 'Analytics'
    };
    const breadcrumbs = {
        overview: 'Overview',
        approvals: 'Approvals / Pending',
        team: 'Team / Management',
        reports: 'Reports / Analytics'
    };
    
    const titleEl = document.getElementById('page-title');
    const breadEl = document.getElementById('page-breadcrumb');
    
    if(titleEl) titleEl.textContent = titles[sectionId] || 'Dashboard';
    if(breadEl) breadEl.textContent = `Management Panel / ${breadcrumbs[sectionId] || 'Overview'}`;

    // 4. Load Data per section
    if (sectionId === 'team') loadTeamData();
    if (sectionId === 'approvals') renderFullApprovalList();
    if (sectionId === 'overview') loadPendingApprovals();
    if (sectionId === 'reports') initCharts();
}

// ── Load Dashboard Core ───────────────────────────────────────
async function loadDashboard() {
    try {
        initSidebar();
        
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        if (data.status === 'success') {
            currentUser = data.user;
            renderUserProfile();
            loadPendingApprovals();
        }
    } catch (e) {
        console.error('Error loading dashboard:', e);
    }
}

function renderUserProfile() {
    const initials = (currentUser.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
    if(document.getElementById('user-avatar')) document.getElementById('user-avatar').textContent = initials;
    if(document.getElementById('user-name')) document.getElementById('user-name').textContent = currentUser.fullName || 'User';
    if(document.getElementById('welcome-text')) document.getElementById('welcome-text').textContent = `Welcome back, ${(currentUser.fullName || '').split(' ')[0]}`;
}

// ── Approvals Section ──────────────────────────────────────────
async function loadPendingApprovals() {
    try {
        const res = await fetch('/api/approvals/pending'); 
        const data = await res.json();
        if (data.status === 'success') {
            pendingExpenses = data.expenses;
            if(document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = pendingExpenses.length;
            renderMiniList();
        }
    } catch (e) {
        console.error('Error loading approvals:', e);
    }
}

function renderMiniList() {
    const container = document.getElementById('pending-list-mini');
    if (!container) return;
    
    if (pendingExpenses.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-muted">No pending approvals found.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table align-middle">
                <tbody>
                    ${pendingExpenses.slice(0, 5).map(exp => `
                        <tr>
                            <td><div class="fw-semibold text-truncate" style="max-width: 150px;">${exp.employeeName || 'Unknown'}</div></td>
                            <td class="fw-bold text-primary">$${exp.amount}</td>
                            <td><span class="badge bg-light text-dark shadow-sm border">${exp.category || 'General'}</span></td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-outline-primary" onclick="openExpenseDetail('${exp.id}')">Review</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function renderFullApprovalList() {
    const container = document.getElementById('full-approval-list');
    if (!container) return;

    const searchInput = document.getElementById('approval-search');
    const catInput = document.getElementById('approval-filter-category');
    
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    const catFilter = catInput ? catInput.value : 'all';

    const filtered = pendingExpenses.filter(exp => {
        const matchesSearch = (exp.employeeName || '').toLowerCase().includes(searchVal) || 
                              (exp.category || '').toLowerCase().includes(searchVal);
        const matchesCat = catFilter === 'all' || exp.category === catFilter;
        return matchesSearch && matchesCat;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="p-5 text-center text-muted">No pending reviews found matching filters.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table align-middle">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Date</th>
                        <th class="text-end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(exp => `
                        <tr class="hover-shadow-sm">
                            <td>
                                <div class="fw-semibold">${exp.employeeName || 'Unknown'}</div>
                                <div class="text-muted small">${exp.id.substring(0,8)}</div>
                            </td>
                            <td><span class="badge bg-light text-dark shadow-sm border">${exp.category || 'General'}</span></td>
                            <td class="fw-bold text-primary">$${exp.amount}</td>
                            <td>${new Date(exp.createdAt).toLocaleDateString()}</td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-primary px-3 shadow-sm" onclick="openExpenseDetail('${exp.id}')">
                                    <i class="bi bi-eye me-1"></i> Review & Audit
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

// ── Detailed Expense Review Modal ──────────────────────────
let activeReviewId = null;

window.openExpenseDetail = function(id) {
    const exp = pendingExpenses.find(e => e.id === id);
    if (!exp) return;

    activeReviewId = id;
    
    // Clear previous comment
    const commentEl = document.getElementById('approval-comment');
    if(commentEl) commentEl.value = '';

    // Populate Modal
    document.getElementById('detail-employee').textContent = exp.employeeName || 'Unknown';
    document.getElementById('detail-date').textContent = new Date(exp.createdAt).toLocaleString();
    document.getElementById('detail-category').textContent = exp.category || 'General';
    document.getElementById('detail-description').textContent = exp.description || 'No description provided.';
    
    // Original vs Converted Amount
    const original = exp.originalAmount ? `${exp.originalAmount} ${exp.originalCurrency || ''}` : `$${exp.amount}`;
    const converted = `$${exp.amount} INR`; // We normalize to INR in backend
    
    document.getElementById('detail-original-amount').textContent = original;
    document.getElementById('detail-converted-amount').textContent = converted;

    // Receipt Image
    const img = document.getElementById('detail-receipt-img');
    const placeholder = document.getElementById('no-receipt-placeholder');
    
    if (exp.receiptUrl) {
        img.src = exp.receiptUrl;
        img.classList.remove('d-none');
        placeholder.classList.add('d-none');
    } else {
        img.src = '';
        img.classList.add('d-none');
        placeholder.classList.remove('d-none');
    }

    // Modal Events
    document.getElementById('btn-approve-claim').onclick = () => window.processApproval(id, 'approved');
    document.getElementById('btn-reject-claim').onclick = () => window.processApproval(id, 'rejected');
    document.getElementById('btn-escalate').onclick = () => window.processApproval(id, 'escalated');

    const modal = new bootstrap.Modal(document.getElementById('expenseDetailModal'));
    modal.show();
}

// ── Team Management ──────────────────────────────────────────
async function loadTeamData() {
    console.log('[SPA] Loading Team Data...');
    const container = document.getElementById('team-list-container');
    if (!container) {
        console.error('[SPA] team-list-container NOT FOUND');
        return;
    }
    container.innerHTML = `<div class="p-5 text-center text-muted">Loading team data...</div>`;

    try {
        const [teamRes, expRes] = await Promise.all([
            fetch('/api/manager/team'),
            fetch('/api/manager/team/expenses')
        ]);
        
        console.log('[SPA] Team API response statuses:', teamRes.status, expRes.status);
        
        const teamData = await teamRes.json();
        const expData = await expRes.json();

        console.log('[SPA] Team Data received:', teamData.team?.length || 0, 'members');
        console.log('[SPA] Team Expenses received:', expData.expenses?.length || 0, 'claims');

        if (teamData.status === 'success') teamMembers = teamData.team;
        if (expData.status === 'success') teamExpenses = expData.expenses;

        renderTeamList();
    } catch (e) {
        console.error('[SPA] Error loading team data:', e);
        container.innerHTML = `<div class="p-5 text-center text-danger">Failed to load team data. Error: ${e.message}</div>`;
    }
}

function renderTeamList() {
    const container = document.getElementById('team-list-container');
    if (!container) return;

    if (teamMembers.length === 0) {
        container.innerHTML = `<div class="p-5 text-center text-muted">No direct reports found on your team.</div>`;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table align-middle">
                <thead>
                    <tr>
                        <th>Member</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Open Claims</th>
                        <th class="text-end">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${teamMembers.map(member => {
                        const activeClaims = teamExpenses.filter(e => e.submittedBy === member.uid && e.status !== 'approved' && e.status !== 'rejected').length;
                        const initials = (member.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase();
                        
                        return `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center gap-3">
                                    <div class="team-avatar shadow-sm">${initials}</div>
                                    <div class="fw-semibold">${member.fullName}</div>
                                </div>
                            </td>
                            <td class="text-muted small">${member.email}</td>
                            <td><span class="badge bg-light text-primary border">${member.role}</span></td>
                            <td><span class="fw-bold">${activeClaims}</span></td>
                            <td class="text-end">
                                <button class="btn btn-sm btn-primary" onclick="viewTeamMemberHistory('${member.uid}', '${member.fullName}')">
                                    History
                                </button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

window.viewTeamMemberHistory = function(uid, name) {
    const modalBody = document.getElementById('history-modal-body');
    const modalTitle = document.getElementById('historyModalLabel');
    if(modalTitle) modalTitle.textContent = `${name}'s Expense History`;

    const userExps = teamExpenses.filter(e => e.submittedBy === uid);

    if (userExps.length === 0) {
        if(modalBody) modalBody.innerHTML = `<div class="p-5 text-center text-muted">No claim history found for this employee.</div>`;
    } else {
        if(modalBody) modalBody.innerHTML = `
            <table class="table table-hover align-middle">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${userExps.map(e => `
                        <tr>
                            <td class="small">${new Date(e.createdAt).toLocaleDateString()}</td>
                            <td><span class="badge bg-light text-dark">${e.category || 'General'}</span></td>
                            <td class="fw-bold">$${e.amount}</td>
                            <td><span class="badge ${getStatusBadge(e.status)}">${e.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    const modalEl = document.getElementById('teamHistoryModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }
}

function getStatusBadge(status) {
    if (status === 'approved') return 'bg-success text-white';
    if (status === 'rejected') return 'bg-danger text-white';
    return 'bg-warning text-dark';
}

// ── Analytics & Charts ─────────────────────────────────────────
async function initCharts() {
    console.log('[Analytics] Initializing Real-time Charts...');
    
    try {
        const res = await fetch('/api/manager/analytics');
        const result = await res.json();
        
        if (result.status !== 'success') {
            console.error('[Analytics] Failed to fetch data:', result.message);
            return;
        }

        const stats = result.data;

        // 1. Spending Trends (Line Chart)
        const trendCtx = document.getElementById('spendingTrendChart');
        if (trendCtx) {
            // Destroy existing chart if any (to avoid hover glitches)
            const existingChart = Chart.getChart(trendCtx);
            if (existingChart) existingChart.destroy();

            new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: stats.trends.labels,
                    datasets: [{
                        label: 'Team Spending (INR)',
                        data: stats.trends.data,
                        borderColor: '#2563eb',
                        tension: 0.4,
                        fill: true,
                        backgroundColor: 'rgba(37, 99, 235, 0.1)'
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        // 2. Category Distribution (Doughnut)
        const catCtx = document.getElementById('categoryDistributionChart');
        if (catCtx) {
            const existingChart = Chart.getChart(catCtx);
            if (existingChart) existingChart.destroy();

            if (stats.distribution.labels.length === 0) {
                // Handle empty state
                const ctx = catCtx.getContext('2d');
                ctx.font = '14px Outfit';
                ctx.textAlign = 'center';
                ctx.fillText('No claims submitted yet', catCtx.width/2, catCtx.height/2);
                return;
            }

            new Chart(catCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.distribution.labels,
                    datasets: [{
                        data: stats.distribution.data,
                        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } }
                    }
                }
            });
        }
    } catch (e) {
        console.error('[Analytics] Error initializing charts:', e);
    }
}

// ── Shared Actions ───────────────────────────────────────────
window.processApproval = async function(expenseId, action) {
    const comment = document.getElementById('approval-comment')?.value || '';
    
    if (action === 'rejected' && !comment.trim()) {
        alert('Please provide a comment for rejection.');
        return;
    }

    if (!confirm(`Are you sure you want to ${action} this expense?`)) return;

    try {
        const res = await fetch('/api/expenses/override', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expenseId, action, comment })
        });
        const data = await res.json();
        if (data.status === 'success') {
            // Close modal if open
            const modalEl = document.getElementById('expenseDetailModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
            
            alert(`Expense ${action} successfully.`);
            loadDashboard(); // Refresh all
            if (document.getElementById('section-approvals').classList.contains('active')) {
                loadPendingApprovals().then(() => renderFullApprovalList());
            }
        } else {
            alert('Error: ' + data.message);
        }
    } catch (e) {
        console.error('Error processing approval:', e);
        alert('An error occurred.');
    }
};

// ── Event Listeners ──────────────────────────────────────────
const searchInput = document.getElementById('approval-search');
if(searchInput) searchInput.addEventListener('input', renderFullApprovalList);

const categoryFilter = document.getElementById('approval-filter-category');
if(categoryFilter) categoryFilter.addEventListener('change', renderFullApprovalList);

// ── Boot ──────────────────────────────────────────────────────
loadDashboard();
