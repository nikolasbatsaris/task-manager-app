let tasks = [];
let editingIndex = -1;
let currentSort = { field: 'name', order: 'asc' };
let currentFilter = 'all';

// Load dark mode preference
function loadDarkMode() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    $('#darkModeToggle i').removeClass('bi-moon-fill').addClass('bi-sun-fill');
  }
}

// Toggle dark mode
function toggleDarkMode() {
  const isDarkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', isDarkMode);
  
  // Animate the button
  const button = $('#darkModeToggle');
  button.addClass('flip');
  setTimeout(() => {
    button.removeClass('flip');
    button.find('i').toggleClass('bi-moon-fill bi-sun-fill');
  }, 500);
}

// Load tasks from localStorage
function loadTasks() {
  const savedTasks = localStorage.getItem('tasks');
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
    updateTable();
  }
}

// Save tasks to localStorage
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function getPriorityClass(priority) {
  switch(priority) {
    case 'high': return 'table-danger';
    case 'medium': return 'table-warning';
    case 'low': return 'table-success';
    default: return '';
  }
}

function getPriorityBadge(priority) {
  const colors = {
    high: 'danger',
    medium: 'warning',
    low: 'success'
  };
  return `<span class="badge bg-${colors[priority]}">${priority.charAt(0).toUpperCase() + priority.slice(1)}</span>`;
}

function sortTasks(tasks) {
  // If manual sort is selected, return tasks in their current order
  if (currentSort.field === 'manual') {
    return tasks;
  }

  return [...tasks].sort((a, b) => {
    let comparison = 0;
    if (currentSort.field === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (currentSort.field === 'dueDate') {
      comparison = new Date(a.dueDate) - new Date(b.dueDate);
    } else if (currentSort.field === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return currentSort.order === 'asc' ? comparison : -comparison;
  });
}

function filterTasks(tasks) {
  if (currentFilter === 'all') return tasks;
  return tasks.filter(task => 
    currentFilter === 'completed' ? task.completed : !task.completed
  );
}

function updateTable() {
  const tbody = $("#taskTable tbody");
  tbody.empty();

  let completed = 0;
  let pending = 0;

  // Sort and filter tasks
  const sortedTasks = sortTasks(tasks);
  const filteredTasks = filterTasks(sortedTasks);

  filteredTasks.forEach((task, index) => {
    const statusBadge = task.completed
      ? `<span class="badge bg-success">Completed</span>`
      : `<span class="badge bg-warning text-dark">Pending</span>`;

    if (task.completed) completed++;
    else pending++;

    const row = `
      <tr class="${getPriorityClass(task.priority)}" data-index="${tasks.indexOf(task)}">
        <td>${task.name}</td>
        <td>${task.description}</td>
        <td>${task.dueDate}</td>
        <td>${statusBadge} ${getPriorityBadge(task.priority)}</td>
        <td>
          <button class="btn btn-sm btn-success complete-btn" data-index="${tasks.indexOf(task)}">✓</button>
          <button class="btn btn-sm btn-primary edit-btn" data-index="${tasks.indexOf(task)}">✏️</button>
          <button class="btn btn-sm btn-danger delete-btn" data-index="${tasks.indexOf(task)}">✕</button>
        </td>
      </tr>
    `;
    tbody.append(row);
  });

  // Initialize sortable after adding rows
  initializeSortable();

  $("#totalTasks").text(tasks.length);
  $("#completedTasks").text(completed);
  $("#pendingTasks").text(pending);
}

function initializeSortable() {
  $("#taskTable tbody").sortable({
    items: "tr",
    cursor: "move",
    opacity: 0.6,
    helper: function(e, tr) {
      const $originals = tr.children();
      const $helper = tr.clone();
      $helper.children().each(function(index) {
        $(this).width($originals.eq(index).width());
      });
      return $helper;
    },
    update: function(event, ui) {
      // Get the new order of tasks
      const newOrder = [];
      $("#taskTable tbody tr").each(function() {
        const index = $(this).data('index');
        newOrder.push(tasks[index]);
      });
      
      // Update the tasks array with the new order
      tasks = newOrder;
      
      // Save to localStorage
      saveTasks();
      
      // Update the table to refresh button indexes
      updateTable();
    }
  }).disableSelection();
}

function resetForm() {
  $("#taskForm")[0].reset();
  $("#submitBtn").text("Add");
  editingIndex = -1;
}

function updateSortButton(button) {
  const field = button.data('sort');
  const order = button.data('order');
  const newOrder = order === 'asc' ? 'desc' : 'asc';
  const arrow = newOrder === 'asc' ? '↑' : '↓';
  
  // Reset all sort buttons
  $('.sort-btn').each(function() {
    $(this).data('order', 'asc');
    $(this).text($(this).text().replace(/[↑↓]/, '↑'));
  });
  
  // Update clicked button
  button.data('order', newOrder);
  
  // Don't show arrow for manual sort
  if (field === 'manual') {
    button.text('Manual Sort');
  } else {
    button.text(button.text().replace(/[↑↓]/, arrow));
  }
}

$(document).ready(function () {
  // Load dark mode preference
  loadDarkMode();

  // Dark mode toggle handler
  $("#darkModeToggle").on("click", toggleDarkMode);

  // Load saved tasks when page loads
  loadTasks();

  // Export tasks to file
  $("#exportBtn").on("click", function() {
    const tasksJson = JSON.stringify(tasks, null, 2);
    const blob = new Blob([tasksJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import tasks from file
  $("#importBtn").on("click", function() {
    $("#importFile").click();
  });

  $("#importFile").on("change", function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const importedTasks = JSON.parse(e.target.result);
          if (Array.isArray(importedTasks)) {
            tasks = importedTasks;
            saveTasks();
            updateTable();
            alert('Tasks imported successfully!');
          } else {
            alert('Invalid file format. Please import a valid tasks file.');
          }
        } catch (error) {
          alert('Error importing tasks. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
    // Reset the file input
    this.value = '';
  });

  $("#taskForm").on("submit", function (e) {
    e.preventDefault();
    const name = $("#taskName").val();
    const desc = $("#taskDesc").val();
    const due = $("#taskDue").val();
    const priority = $("#taskPriority").val();

    if (editingIndex === -1) {
      tasks.push({
        name,
        description: desc,
        dueDate: due,
        priority,
        completed: false
      });
    } else {
      tasks[editingIndex] = {
        ...tasks[editingIndex],
        name,
        description: desc,
        dueDate: due,
        priority
      };
    }

    resetForm();
    updateTable();
    saveTasks();
  });

  // Sort button click handler
  $(".sort-btn").on("click", function() {
    const field = $(this).data('sort');
    const order = $(this).data('order');
    
    currentSort = { field, order };
    updateSortButton($(this));
    updateTable();
  });

  // Filter button click handler
  $(".filter-btn").on("click", function() {
    $(".filter-btn").removeClass("active");
    $(this).addClass("active");
    currentFilter = $(this).data('filter');
    updateTable();
  });

  $("#taskTable").on("click", ".complete-btn", function () {
    const index = $(this).data("index");
    tasks[index].completed = true;
    updateTable();
    saveTasks();
  });

  $("#taskTable").on("click", ".edit-btn", function () {
    const index = $(this).data("index");
    const task = tasks[index];
    
    $("#taskName").val(task.name);
    $("#taskDesc").val(task.description);
    $("#taskDue").val(task.dueDate);
    $("#taskPriority").val(task.priority);
    $("#submitBtn").text("Update");
    
    editingIndex = index;
  });

  $("#taskTable").on("click", ".delete-btn", function () {
    const index = $(this).data("index");
    tasks.splice(index, 1);
    updateTable();
    saveTasks();
  });
});
