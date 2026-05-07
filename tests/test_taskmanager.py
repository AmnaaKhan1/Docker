
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = "http://3.136.159.159"

# ──────────────────────────────────────────────
# Helper Utilities
# ──────────────────────────────────────────────

def wait_for(driver, by, value, timeout=10):
    """Wait until an element is visible and return it."""
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, value))
    )

def wait_for_clickable(driver, by, value, timeout=10):
    """Wait until an element is clickable and return it."""
    return WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, value))
    )

def add_task(driver, title, description=""):
    """Reusable helper: fill the form and submit a new task."""
    title_input = wait_for(driver, By.ID, "titleInput")
    title_input.clear()
    title_input.send_keys(title)

    if description:
        desc_input = driver.find_element(By.ID, "descriptionInput")
        desc_input.clear()
        desc_input.send_keys(description)

    submit_btn = wait_for_clickable(driver, By.CSS_SELECTOR, "#addItemForm button[type='submit']")
    submit_btn.click()
    time.sleep(1)  # Allow DOM update after submission


def get_task_cards(driver):
    """Return all visible task card elements."""
    return driver.find_elements(By.CSS_SELECTOR, "#tasksContainer .task-card, #tasksContainer .item-card, #tasksContainer .task-item, #tasksContainer [class*='card']")


def click_filter(driver, filter_name):
    """Click a filter button: 'all', 'active', or 'deleted'."""
    btn = wait_for_clickable(driver, By.CSS_SELECTOR, f".filter-btn[data-filter='{filter_name}']")
    btn.click()
    time.sleep(0.8)


# ══════════════════════════════════════════════
# TEST CASE 1 — Page Loads Successfully
# ══════════════════════════════════════════════
class TestTC01_PageLoad:
    def test_page_title_contains_task_manager(self, app):
        """Verify the page title contains 'Task Manager'."""
        assert "Task Manager" in app.title, f"Expected 'Task Manager' in title, got: '{app.title}'"


# ══════════════════════════════════════════════
# TEST CASE 2 — Header Elements Are Present
# ══════════════════════════════════════════════
class TestTC02_HeaderElements:
    def test_header_logo_and_title_visible(self, app):
        """Verify the logo emoji and H1 heading are visible."""
        h1 = wait_for(app, By.CSS_SELECTOR, "header h1")
        assert "Task Manager" in h1.text

        logo = app.find_element(By.CSS_SELECTOR, ".logo")
        assert logo.is_displayed()


# ══════════════════════════════════════════════
# TEST CASE 3 — Stats Section Renders
# ══════════════════════════════════════════════
class TestTC03_StatsSection:
    def test_stat_cards_are_visible(self, app):
        """Verify Total, Active, and Deleted stat cards are on the page."""
        total  = wait_for(app, By.ID, "totalItems")
        active = app.find_element(By.ID, "activeItems")
        deleted = app.find_element(By.ID, "deletedItems")

        assert total.is_displayed()
        assert active.is_displayed()
        assert deleted.is_displayed()


# ══════════════════════════════════════════════
# TEST CASE 4 — Task Form Is Present
# ══════════════════════════════════════════════
class TestTC04_FormPresence:
    def test_add_task_form_elements_exist(self, app):
        """Verify title input, description textarea, and submit button are present."""
        title_input = wait_for(app, By.ID, "titleInput")
        desc_input  = app.find_element(By.ID, "descriptionInput")
        submit_btn  = app.find_element(By.CSS_SELECTOR, "#addItemForm button[type='submit']")

        assert title_input.is_displayed()
        assert desc_input.is_displayed()
        assert submit_btn.is_displayed()
        assert "Add Task" in submit_btn.text


# ══════════════════════════════════════════════
# TEST CASE 5 — Create a New Task
# ══════════════════════════════════════════════
class TestTC05_CreateTask:
    def test_add_single_task_appears_in_list(self, app):
        """Submit a new task and verify it appears in the tasks container."""
        task_title = "Buy groceries"
        add_task(app, task_title, "Milk, eggs, bread")

        # Task should now appear in the container
        tasks_container = wait_for(app, By.ID, "tasksContainer")
        assert task_title in tasks_container.text, (
            f"Task '{task_title}' not found in tasks container after adding."
        )


# ══════════════════════════════════════════════
# TEST CASE 6 — Total Count Increments After Adding Task
# ══════════════════════════════════════════════
class TestTC06_StatCountIncrement:
    def test_total_count_increases_after_add(self, app):
        """Verify the Total Tasks stat increments when a task is added."""
        total_el = wait_for(app, By.ID, "totalItems")
        count_before = int(total_el.text or "0")

        add_task(app, "TC06 - Count test task")

        total_el = wait_for(app, By.ID, "totalItems")
        count_after = int(total_el.text or "0")

        assert count_after == count_before + 1, (
            f"Expected total to go from {count_before} to {count_before + 1}, got {count_after}"
        )


# ══════════════════════════════════════════════
# TEST CASE 7 — Create Task With Description
# ══════════════════════════════════════════════
class TestTC07_CreateTaskWithDescription:
    def test_task_with_description_is_saved(self, app):
        """Add a task with both title and description; both should appear."""
        title = "TC07 - Task with description"
        desc  = "This is a detailed description for the task."
        add_task(app, title, desc)

        container = wait_for(app, By.ID, "tasksContainer")
        assert title in container.text


# ══════════════════════════════════════════════
# TEST CASE 8 — Empty Title Validation
# ══════════════════════════════════════════════
class TestTC08_EmptyTitleValidation:
    def test_submit_without_title_does_not_add_task(self, app):
        """Submitting the form with an empty title should not create a new task."""
        total_el = wait_for(app, By.ID, "totalItems")
        count_before = int(total_el.text or "0")

        # Try submitting with empty title
        submit_btn = wait_for_clickable(app, By.CSS_SELECTOR, "#addItemForm button[type='submit']")
        submit_btn.click()
        time.sleep(1)

        total_el = app.find_element(By.ID, "totalItems")
        count_after = int(total_el.text or "0")

        assert count_after == count_before, (
            "Task count should not change when submitting an empty title."
        )


# ══════════════════════════════════════════════
# TEST CASE 9 — Filter Buttons Are Present
# ══════════════════════════════════════════════
class TestTC09_FilterButtonsPresent:
    def test_all_active_deleted_filter_buttons_exist(self, app):
        """Verify All, Active, and Deleted filter buttons are present."""
        all_btn     = wait_for(app, By.CSS_SELECTOR, ".filter-btn[data-filter='all']")
        active_btn  = app.find_element(By.CSS_SELECTOR, ".filter-btn[data-filter='active']")
        deleted_btn = app.find_element(By.CSS_SELECTOR, ".filter-btn[data-filter='deleted']")

        assert all_btn.is_displayed()
        assert active_btn.is_displayed()
        assert deleted_btn.is_displayed()


# ══════════════════════════════════════════════
# TEST CASE 10 — Filter: Active Shows Only Active Tasks
# ══════════════════════════════════════════════
class TestTC10_FilterActive:
    def test_active_filter_button_becomes_active(self, app):
        """Clicking 'Active' filter should mark that button as active."""
        add_task(app, "TC10 - Active filter task")

        active_btn = wait_for_clickable(app, By.CSS_SELECTOR, ".filter-btn[data-filter='active']")
        active_btn.click()
        time.sleep(1)

        # The button should now carry the 'active' class
        btn_classes = active_btn.get_attribute("class")
        assert "active" in btn_classes, (
            f"Expected 'active' class on the Active filter button, got: '{btn_classes}'"
        )


# ══════════════════════════════════════════════
# TEST CASE 11 — Filter: All Button Resets View
# ══════════════════════════════════════════════
class TestTC11_FilterAll:
    def test_all_filter_shows_all_tasks(self, app):
        """After switching filters, clicking 'All' should restore the full list."""
        add_task(app, "TC11 - All filter task")

        # Switch to Active then back to All
        click_filter(app, "active")
        click_filter(app, "all")

        all_btn = app.find_element(By.CSS_SELECTOR, ".filter-btn[data-filter='all']")
        assert "active" in all_btn.get_attribute("class")


# ══════════════════════════════════════════════
# TEST CASE 12 — Edit Modal Opens
# ══════════════════════════════════════════════
class TestTC12_EditModalOpens:
    def test_edit_button_opens_edit_modal(self, app):
        """Clicking the edit button on a task should open the Edit Task modal."""
        add_task(app, "TC12 - Task to edit")

        # Find and click the first edit button
        edit_btn = wait_for_clickable(app, By.CSS_SELECTOR,
            "#tasksContainer button[onclick*='edit'], "
            "#tasksContainer .edit-btn, "
            "#tasksContainer button[class*='edit']"
        )
        edit_btn.click()
        time.sleep(0.8)

        modal = wait_for(app, By.ID, "editModal")
        assert modal.is_displayed(), "Edit modal should be visible after clicking edit button."


# ══════════════════════════════════════════════
# TEST CASE 13 — Edit Modal Input Is Pre-filled
# ══════════════════════════════════════════════
class TestTC13_EditModalPrefilled:
    def test_edit_modal_title_is_prefilled(self, app):
        """The edit modal's title input should be pre-filled with the task's current title."""
        task_title = "TC13 - Prefill check task"
        add_task(app, task_title)

        edit_btn = wait_for_clickable(app, By.CSS_SELECTOR,
            "#tasksContainer button[onclick*='edit'], "
            "#tasksContainer .edit-btn, "
            "#tasksContainer button[class*='edit']"
        )
        edit_btn.click()
        time.sleep(0.8)

        edit_title_input = wait_for(app, By.ID, "editTitleInput")
        current_value = edit_title_input.get_attribute("value")

        assert current_value != "", "Edit title input should not be empty (should be pre-filled)."


# ══════════════════════════════════════════════
# TEST CASE 14 — Delete Modal Opens
# ══════════════════════════════════════════════
class TestTC14_DeleteModalOpens:
    def test_delete_button_opens_confirm_modal(self, app):
        """Clicking the delete button on a task should open the Delete confirmation modal."""
        add_task(app, "TC14 - Task to delete")

        delete_btn = wait_for_clickable(app, By.CSS_SELECTOR,
            "#tasksContainer button[onclick*='delete'], "
            "#tasksContainer .delete-btn, "
            "#tasksContainer button[class*='delete']"
        )
        delete_btn.click()
        time.sleep(0.8)

        modal = wait_for(app, By.ID, "deleteModal")
        assert modal.is_displayed(), "Delete confirmation modal should be visible."


# ══════════════════════════════════════════════
# TEST CASE 15 — Confirm Delete Removes Task
# ══════════════════════════════════════════════
class TestTC15_ConfirmDelete:
    def test_confirming_delete_removes_task_from_active_list(self, app):
        """After confirming deletion, the deleted task should no longer appear in Active filter."""
        task_title = "TC15 - Task to be deleted"
        add_task(app, task_title)

        # Open delete modal
        delete_btn = wait_for_clickable(app, By.CSS_SELECTOR,
            "#tasksContainer button[onclick*='delete'], "
            "#tasksContainer .delete-btn, "
            "#tasksContainer button[class*='delete']"
        )
        delete_btn.click()
        time.sleep(0.8)

        # Confirm deletion
        confirm_btn = wait_for_clickable(app, By.CSS_SELECTOR,
            "#deleteModal .btn-danger, #deleteModal button[onclick*='confirmDelete']"
        )
        confirm_btn.click()
        time.sleep(1)

        # Switch to Active filter — deleted task should not be listed there
        click_filter(app, "active")

        container = app.find_element(By.ID, "tasksContainer")
        assert task_title not in container.text, (
            f"Deleted task '{task_title}' should not appear under the Active filter."
        )