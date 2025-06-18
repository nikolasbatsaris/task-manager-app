$(document).ready(function () {
  let shipments = [];
  let editingIndex = -1;

  function loadShipments() {
      const saved = localStorage.getItem("shipments");
      if (saved) shipments = JSON.parse(saved);
      updateTable();
  }

  function saveShipments() {
      localStorage.setItem("shipments", JSON.stringify(shipments));
  }

  function updateTable() {
      console.log('Updating table with shipments:', shipments); // Debug log
      const tbody = $("#taskTable tbody");
      tbody.empty();

      if (shipments.length === 0) {
          tbody.append('<tr><td colspan="5" class="text-center">No shipments found</td></tr>');
          return;
      }

      shipments.forEach((shipment, index) => {
          // Skip null or invalid shipments
          if (!shipment || typeof shipment !== 'object' || !shipment.shipmentId) {
              console.warn('Skipping invalid shipment at index', index, shipment);
              return;
          }
          console.log('Creating row for shipment:', shipment); // Debug log
          const row = `
              <tr>
                  <td>${shipment.shipmentId}</td>
                  <td>${shipment.description || ''}</td>
                  <td>${shipment.arrival}</td>
                  <td>${shipment.urgency}</td>
                  <td>${shipment.status || ''}</td>
                  <td>
                      <button class="btn btn-sm btn-primary edit-btn" data-index="${index}">Edit</button>
                      <button class="btn btn-sm btn-danger delete-btn" data-index="${index}">Delete</button>
                  </td>
              </tr>
          `;
          tbody.append(row);
      });
      renderMiniCalendar();
  }

  $("#taskForm").on("submit", function (e) {
      e.preventDefault();
      console.log('Form submitted'); // Debug log
      
      const shipmentId = $("#taskName").val().trim();
      const description = $("#taskDesc").val().trim();
      const arrival = $("#taskDue").val();
      const urgency = $("#taskPriority").val();
      const status = $("#status").val();

      console.log('Form values:', { shipmentId, description, arrival, urgency, status }); // Debug log

      // Validate form
      if (!shipmentId) {
          alert('Please enter a shipment ID');
          $("#taskName").focus();
          return;
      }
      if (!arrival) {
          alert('Please select an arrival date');
          $("#taskDue").focus();
          return;
      }
      if (!urgency) {
          alert('Please select an urgency');
          $("#taskPriority").focus();
          return;
      }
      if (!status) {
          alert('Please select a status');
          $("#status").focus();
          return;
      }

      // Create new shipment object
      const newShipment = {
          shipmentId,
          description,
          arrival,
          urgency,
          status
      };

      if (editingIndex === -1) {
          console.log('Adding new shipment:', newShipment); // Debug log
          shipments.push(newShipment);
      } else {
          console.log('Updating shipment at index:', editingIndex, 'with:', newShipment); // Debug log
          shipments[editingIndex] = newShipment;
      }

      console.log('Current shipments:', shipments); // Debug log
      
      // Reset form and update display
      $("#taskForm")[0].reset();
      editingIndex = -1;
      $("#taskForm button[type='submit']").text('Add Shipment');
      updateTable();
      saveShipments();
  });

  $("#taskTable").on("click", ".edit-btn", function () {
      const index = $(this).data("index");
      console.log('Editing shipment at index:', index); // Debug log
      const shipment = shipments[index];

      $("#taskName").val(shipment.shipmentId);
      $("#taskDesc").val(shipment.description);
      $("#taskDue").val(shipment.arrival);
      $("#taskPriority").val(shipment.urgency);
      $("#status").val(shipment.status);
      
      editingIndex = index;
      $("#taskForm button[type='submit']").text('Save Edit');
      $("html, body").animate({ scrollTop: $("#taskForm").offset().top - 20 }, 500);
  });

  $("#taskTable").on("click", ".delete-btn", function () {
      const index = $(this).data("index");
      if (confirm("Are you sure you want to delete this shipment?")) {
          shipments.splice(index, 1);
          updateTable();
          saveShipments();
      }
  });

  $("[data-sort]").on("click", function() {
      const sortBy = $(this).data("sort");
      console.log('Sorting by:', sortBy); // Debug log

      // Only sort valid shipments
      const validShipments = shipments.filter(shipment => shipment && typeof shipment === 'object' && shipment[sortBy]);
      validShipments.sort((a, b) => {
          if (sortBy === 'shipmentId') {
              return a.shipmentId.localeCompare(b.shipmentId);
          } else if (sortBy === 'arrival') {
              return new Date(a.arrival) - new Date(b.arrival);
          } else if (sortBy === 'urgency') {
              const urgencyOrder = { high: 0, medium: 1, low: 2 };
              return urgencyOrder[a.urgency.toLowerCase()] - urgencyOrder[b.urgency.toLowerCase()];
          } else if (sortBy === 'status') {
              const statusOrder = { 'In Transit': 0, 'Delivered': 1, 'Delayed': 2 };
              return statusOrder[a.status] - statusOrder[b.status];
          }
      });
      // Replace only the valid part of the array, keep invalids in place
      let vi = 0;
      shipments = shipments.map(shipment => (shipment && typeof shipment === 'object' && shipment[sortBy]) ? validShipments[vi++] : shipment);
      updateTable();
      saveShipments();
  });

  // Dark mode toggle logic (shared for all pages)
  function setDarkMode(enabled) {
      if (enabled) {
          $('body').addClass('dark-mode');
          $('#darkModeIcon').text('☀️');
      } else {
          $('body').removeClass('dark-mode');
          $('#darkModeIcon').text('🌙');
      }
  }

  // On page load, set dark mode if saved
  const darkPref = localStorage.getItem('darkMode') === 'true';
  setDarkMode(darkPref);

  $('#darkModeToggle').on('click', function() {
      const isDark = !$('body').hasClass('dark-mode');
      setDarkMode(isDark);
      localStorage.setItem('darkMode', isDark);
  });

  // Initialize Bootstrap tooltip for dark mode toggle
  if (window.bootstrap && typeof bootstrap.Tooltip === 'function') {
      var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
      tooltipTriggerList.map(function (tooltipTriggerEl) {
          return new bootstrap.Tooltip(tooltipTriggerEl);
      });
  }

  // Mini Calendar rendering
  function renderMiniCalendar() {
      const calendarEl = document.getElementById('miniCalendar');
      if (!calendarEl) return;

      // Get all arrival dates
      const shipmentDates = {};
      shipments.forEach(shipment => {
          if (!shipment || !shipment.arrival) return;
          if (!shipmentDates[shipment.arrival]) shipmentDates[shipment.arrival] = [];
          shipmentDates[shipment.arrival].push(shipment);
      });

      // Get current month/year
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDay = firstDay.getDay();
      const daysInMonth = lastDay.getDate();

      // Build calendar HTML
      let html = '<table class="mini-calendar-table">';
      html += '<thead><tr>';
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let d = 0; d < 7; d++) html += `<th>${days[d]}</th>`;
      html += '</tr></thead><tbody><tr>';

      // Empty cells before first day
      for (let i = 0; i < startDay; i++) html += '<td></td>';

      for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year);
          const hasShipment = shipmentDates[dateStr] && shipmentDates[dateStr].length > 0;
          let tdClass = '';
          if (isToday) tdClass += ' today';
          if (hasShipment) tdClass += ' has-shipment';
          html += `<td class="${tdClass.trim()}" data-date="${dateStr}">${day}`;
          if (hasShipment) {
              html += `<div class="mini-calendar-popup">`;
              shipmentDates[dateStr].forEach(s => {
                  html += `<div><strong>${s.shipmentId}</strong> (${s.urgency})<br><span style='font-size:0.95em;'>${s.description || ''}</span><br><em>Status: ${s.status || ''}</em></div><hr style='margin:4px 0;'>`;
              });
              html += `</div>`;
          }
          html += '</td>';
          if ((startDay + day) % 7 === 0 && day !== daysInMonth) html += '</tr><tr>';
      }
      // Empty cells after last day
      const endDay = (startDay + daysInMonth) % 7;
      if (endDay !== 0) for (let i = endDay; i < 7; i++) html += '<td></td>';
      html += '</tr></tbody></table>';
      calendarEl.innerHTML = html;

      // Popup logic
      $("#miniCalendar td.has-shipment").on('click', function(e) {
          e.stopPropagation();
          $("#miniCalendar td.has-shipment").removeClass('active');
          $(this).addClass('active');
      });
      $(document).on('click', function() {
          $("#miniCalendar td.has-shipment").removeClass('active');
      });
  }

  // Also call it on page load
  $(function() { renderMiniCalendar(); });

  // Mini Summary Section (only on Home page)
  if ($('#miniSummary').length) {
      function renderMiniSummary() {
          let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
          if (!Array.isArray(shipments)) shipments = [];
          const total = shipments.length;
          const inTransit = shipments.filter(s => s.status === 'In Transit').length;
          const delivered = shipments.filter(s => s.status === 'Delivered').length;
          $('#summaryTotal').text(total);
          $('#summaryInTransit').text(inTransit);
          $('#summaryDelivered').text(delivered);
      }
      renderMiniSummary();
  }

  // Latest Activity Section (only on Home page)
  if ($('#latestActivity').length) {
      function renderLatestActivity() {
          let shipments = JSON.parse(localStorage.getItem('shipments') || '[]');
          if (!Array.isArray(shipments)) shipments = [];
          // Sort by arrival date descending, then by last added
          shipments = shipments.filter(s => s && s.shipmentId && s.arrival).sort((a, b) => new Date(b.arrival) - new Date(a.arrival));
          let html = '';
          if (shipments.length === 0) {
              html = '<p class="text-muted mb-0">No recent activity yet.</p>';
          } else {
              html = '<ul class="list-group list-group-flush">';
              shipments.slice(0, 5).forEach(s => {
                  let emoji = '📦';
                  let badge = 'primary';
                  let statusText = s.status || 'Pending';
                  if (statusText === 'Delivered') { emoji = '✅'; badge = 'success'; }
                  else if (statusText === 'Delayed') { emoji = '⚠️'; badge = 'danger'; }
                  else if (statusText === 'In Transit') { emoji = '📦'; badge = 'primary'; }
                  html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                      <span><span aria-label="Status icon" role="img">${emoji}</span> <strong>${s.shipmentId}</strong> - ${statusText}<br><small class="text-muted">Arrival: ${s.arrival}</small></span>
                      <span class="badge bg-${badge}" aria-label="${statusText}">${statusText}</span>
                  </li>`;
              });
              html += '</ul>';
          }
          $('#latestActivity').html(html);
      }
      renderLatestActivity();
  }

  loadShipments();
});
