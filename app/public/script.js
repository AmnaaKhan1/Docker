// ============================================
// State Management
// ============================================

let currentItems = [];
let currentFilter = 'all';
let editingItemId = null;
let deletingItemId = null;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    await checkHealth();
    await loadItems();
    await loadStatistics();
    setupEventListeners();
}

function setupEventListeners() {
    // Form submission
    document.getElementById('addItemForm').addEventListener('submit', handleAddItem);
    document.getElementById('editItemForm').addEventListener('submit', handleEditItem);

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderTasks();
        });
    });

    // Auto-refresh every 10 seconds
    setInterval(async () => {
        await loadItems();
        await loadStatistics();
    }, 10000);
}

// ============================================
// Health Check
// ============================================

async function checkHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();

        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');

        if (data.status === 'healthy' && data.database === 'connected') {
            statusDot.classList.remove('disconnected');
            statusText.textContent = 'Connected';
        } else {
            statusDot.classList.add('disconnected');
            statusText.textContent = 'Disconnected';
        }
    } catch (error) {
        console.error('Health check failed:', error);
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        statusDot.classList.add('disconnected');
        statusText.textContent = 'Error';
    }
}

// ============================================
// Load Items from API
// ============================================

async function loadItems() {
    try {
        const response = await fetch('/api/items');
        const result = await response.json();

        if (result.success) {
            // Fetch all items including deleted ones
            const allItemsResponse = await fetch('/api/items?includeDeleted=true');
            const allItemsResult = await allItemsResponse.json();

            if (allItemsResult.success) {
                // For now, we'll work with active items from the API
                // If we need deleted items, we'd need to modify the API
                currentItems = result.data;
            } else {
                currentItems = result.data;
            }

            renderTasks();
            hideLoadingState();
        } else {
            showError('Failed to load items');
        }
    } catch (error) {
        console.error('Error loading items:', error);
        showError('Error loading items: ' + error.message);
    }
}

// ============================================
// Load Statistics
// ============================================

async function loadStatistics() {
    try {
        const response = await fetch('/api/stats');
        const result = await response.json();

        if (result.success) {
            document.getElementById('totalItems').textContent = result.data.total_items;
            document.getElementById('activeItems').textContent = result.data.active_items;
            document.getElementById('deletedItems').textContent = result.data.deleted_items;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// ============================================
// Render Tasks
// ============================================

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');

    // Filter items based on current filter
    let filteredItems = currentItems;

    if (currentFilter === 'active') {
        filteredItems = currentItems.filter(item => item.status === 'active');
    } else if (currentFilter === 'deleted') {
        filteredItems = currentItems.filter(item => item.status === 'deleted');
    }

    // Clear container
    container.innerHTML = '';

    // Show empty state if no items
    if (filteredItems.length === 0) {
        emptyState.classList.remove('hidden');
        loadingState.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    loadingState.classList.add('hidden');

    // Render each task
    filteredItems.forEach(item => {
        const taskCard = createTaskCard(item);
        container.appendChild(taskCard);
    });
}

function createTaskCard(item) {
    const card = document.createElement('div');
    card.className = `task-card ${item.status === 'deleted' ? 'deleted' : ''}`;
    card.dataset.itemId = item.id;

    const createdDate = new Date(item.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    card.innerHTML = `
        <input type="checkbox" class="task-checkbox" ${item.status === 'deleted' ? 'checked disabled' : ''}>
        
        <div class="task-content">
            <div class="task-title">${escapeHtml(item.title)}</div>
            ${item.description ? `<div class="task-description">${escapeHtml(item.description)}</div>` : ''}
            <div class="task-meta">
                <span>Created: ${createdDate}</span>
                <span class="status-badge ${item.status}">${item.status}</span>
            </div>
        </div>

        <div class="task-actions">
            ${item.status === 'active' ? `
                <button class="task-btn task-btn-edit" onclick="openEditModal(${item.id})">✏️ Edit</button>
                <button class="task-btn task-btn-delete" onclick="openDeleteModal(${item.id})">🗑️ Delete</button>
            ` : `
                <button class="task-btn task-btn-restore" onclick="restoreItem(${item.id})">↩️ Restore</button>
            `}
        </div>
    `;

    return card;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Add Item
// ============================================

async function handleAddItem(e) {
    e.preventDefault();

    const title = document.getElementById('titleInput').value.trim();
    const description = document.getElementById('descriptionInput').value.trim();

    if (!title) {
        showError('Please enter a task title');
        return;
    }

    try {
        const response = await fetch('/api/items', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Task created successfully!');
            document.getElementById('addItemForm').reset();
            await loadItems();
            await loadStatistics();
        } else {
            showError(result.error || 'Failed to create task');
        }
    } catch (error) {
        console.error('Error creating item:', error);
        showError('Error creating task: ' + error.message);
    }
}

// ============================================
// Edit Item
// ============================================

function openEditModal(itemId) {
    const item = currentItems.find(i => i.id === itemId);
    if (!item) return;

    editingItemId = itemId;
    document.getElementById('editTitleInput').value = item.title;
    document.getElementById('editDescriptionInput').value = item.description || '';

    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    editingItemId = null;
}

async function handleEditItem(e) {
    e.preventDefault();

    const title = document.getElementById('editTitleInput').value.trim();
    const description = document.getElementById('editDescriptionInput').value.trim();

    if (!title) {
        showError('Please enter a task title');
        return;
    }

    try {
        const response = await fetch(`/api/items/${editingItemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, description })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Task updated successfully!');
            closeEditModal();
            await loadItems();
            await loadStatistics();
        } else {
            showError(result.error || 'Failed to update task');
        }
    } catch (error) {
        console.error('Error updating item:', error);
        showError('Error updating task: ' + error.message);
    }
}

// ============================================
// Delete Item
// ============================================

function openDeleteModal(itemId) {
    deletingItemId = itemId;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    deletingItemId = null;
}

async function confirmDelete() {
    try {
        const response = await fetch(`/api/items/${deletingItemId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Task deleted successfully!');
            closeDeleteModal();
            await loadItems();
            await loadStatistics();
        } else {
            showError(result.error || 'Failed to delete task');
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        showError('Error deleting task: ' + error.message);
    }
}

// ============================================
// Restore Item
// ============================================

async function restoreItem(itemId) {
    try {
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'active' })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('Task restored successfully!');
            await loadItems();
            await loadStatistics();
        } else {
            showError(result.error || 'Failed to restore task');
        }
    } catch (error) {
        console.error('Error restoring item:', error);
        showError('Error restoring task: ' + error.message);
    }
}

// ============================================
// UI Helper Functions
// ============================================

function showLoadingState() {
    document.getElementById('loadingState').classList.remove('hidden');
    document.getElementById('emptyState').classList.add('hidden');
}

function hideLoadingState() {
    document.getElementById('loadingState').classList.add('hidden');
}

function showSuccess(message) {
    const alertEl = document.getElementById('successMessage');
    alertEl.textContent = message;
    alertEl.classList.remove('hidden');

    setTimeout(() => {
        alertEl.classList.add('hidden');
    }, 4000);
}

function showError(message) {
    const alertEl = document.getElementById('errorMessage');
    alertEl.textContent = message;
    alertEl.classList.remove('hidden');

    setTimeout(() => {
        alertEl.classList.add('hidden');
    }, 4000);
}

// ============================================
// Keyboard Shortcuts
// ============================================

document.addEventListener('keydown', (e) => {
    // Close modal on Escape
    if (e.key === 'Escape') {
        closeEditModal();
        closeDeleteModal();
    }

    // Focus on add form with Ctrl+N
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        document.getElementById('titleInput').focus();
    }
});

// ============================================
// Export Functions for HTML
// ============================================

window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.restoreItem = restoreItem;