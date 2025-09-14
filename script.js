// WebSocket Setup
const gateway = `ws://${window.location.hostname}/ws`;
const websocket = new WebSocket(gateway);


// =======================
// Sidebar Hamburger Toggle (Mobile)
// =======================
const menuToggle = document.getElementById("menu-toggle");
const sidebar = document.querySelector(".sidebar");

if (menuToggle && sidebar) {
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}


document.addEventListener("click", (e) => {
  if (sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      !menuToggle.contains(e.target)) {
    sidebar.classList.remove("open");
  }
});


// DOM Elements
const tempElement = document.getElementById("temp-value");
const humElement = document.getElementById("hum-value");
const motionElement = document.getElementById("motion-status");
const clientsCount = document.getElementById("clients-count");
const motionLogs = document.getElementById("motion-logs");
const minTempElement = document.getElementById("min-temp");
const maxTempElement = document.getElementById("max-temp");
const avgTempElement = document.getElementById("avg-temp");

// Load saved lifetime stats
let savedTempStats = JSON.parse(localStorage.getItem("tempStats")) || { 
  min: null, 
  max: null, 
  avg: null, 
  count: 0, 
  sum: 0 
};

// Restore UI
if (minTempElement) minTempElement.textContent = savedTempStats.min !== null ? `${savedTempStats.min} °C` : "-- °C";
if (maxTempElement) maxTempElement.textContent = savedTempStats.max !== null ? `${savedTempStats.max} °C` : "-- °C";
if (avgTempElement) avgTempElement.textContent = savedTempStats.avg !== null ? `${savedTempStats.avg} °C` : "-- °C";

// Chart & Data Setup
let tempChart, humChart;
let tempData, humData;
const MAX_POINTS = 15; // Show only last 10 points
let lastChartUpdate = 0;





// Restore saved data
let savedTemp = JSON.parse(localStorage.getItem("tempData")) || { labels: [], datasets: [{ data: [] }] };
let savedHum = JSON.parse(localStorage.getItem("humData")) || { labels: [], datasets: [{ data: [] }] };

// ✅ Load motion logs with colors (on page load)
if (motionLogs) {
  const savedLogs = JSON.parse(localStorage.getItem("motionLogs")) || [];
  savedLogs.forEach(log => {
    const li = document.createElement("li");
    li.textContent = log.text;
    li.style.color = "#000"; // Always black text
    li.style.backgroundColor = log.bgColor;
    li.style.padding = "6px";
    li.style.borderRadius = "4px";
    li.style.marginBottom = "4px";
    motionLogs.appendChild(li);
  });
}

// ✅ Restore temp chart if element exists
if (document.getElementById("tempChart")) {
  const tempCtx = document.getElementById("tempChart").getContext("2d");
  tempData = {
    labels: savedTemp.labels || [],
    datasets: [{
      label: "Temperature (°C)",
      data: savedTemp.datasets[0].data || [],
      borderColor: "#3b82f6",
      backgroundColor: "rgba(59,130,246,0.1)",
      fill: true,
      tension: 0.4
    }]
  };
  tempChart = new Chart(tempCtx, { 
    type: "line", 
    data: tempData, 
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        x: {
          ticks: { color: "#fff", autoSkip: true, maxTicksLimit: 10 },
          grid: { color: "rgb(255, 255, 255)" },
          border: { color: "#fff" }
        },
        y: {
          beginAtZero: false,
          suggestedMin: Math.min(...tempData.datasets[0].data) - 1,
          suggestedMax: Math.max(...tempData.datasets[0].data) + 1,
          ticks: { stepSize: 1, color: "#fff" },
          grid: { color: "rgba(255, 255, 255, 0.89)" },
          border: { color: "#fff" }
        },
         y2: {
        position: 'right',                // Place border on the right
        grid: { drawOnChartArea: false }, // No grid lines for y2
        ticks: { display: false },        // Hide ticks
        title: { display: false },        // Hide title if any
        border: { color: "#fff" }         // White border on the right
    }


      }
    }
  });
}

// ✅ Restore humidity chart if element exists
if (document.getElementById("humChart")) {
  const humCtx = document.getElementById("humChart").getContext("2d");
  humData = {
    labels: savedHum.labels || [],
    datasets: [{
      label: "Humidity (%)",
      data: savedHum.datasets[0].data || [],
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.1)",
      fill: true,
      tension: 0.4
    }]
  };
  humChart = new Chart(humCtx, { 
    type: "line", 
    data: humData, 
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "#fff" } }
      },
      scales: {
        x: {
          ticks: { color: "#fff", autoSkip: true, maxTicksLimit: 10 },
          grid: { color: "rgb(255, 255, 255)" },
          border: { color: "#fff" }
        },
        y: {
          beginAtZero: false,
          ticks: {
            stepSize: 1,
            color: "#fff",
            callback: function(value) {
              return Number.isInteger(value) ? value : null; 
            }
          },
          grid: { color: "rgba(255, 255, 255, 0.89)" },
          border: { color: "#fff" }
        },
         y2: {
        position: 'right',                // Place border on the right
        grid: { drawOnChartArea: false }, // No grid lines for y2
        ticks: { display: false },        // Hide ticks
        title: { display: false },        // Hide title if any
        border: { color: "#fff" }         // White border on the right
    }
      }
    }
  });
}


function getFormattedTime() {
  // For chart labels (hh:mm AM/PM)
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

function getFormattedTimeWithSeconds() {
  // For motion logs (hh:mm:ss AM/PM)
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
}



// Save helpers
const saveTempData = () => localStorage.setItem("tempData", JSON.stringify(tempData));
const saveHumData = () => localStorage.setItem("humData", JSON.stringify(humData));

// WebSocket connection handling
websocket.onopen = () => {
  console.log("WebSocket connected");
};

websocket.onclose = () => console.log("WebSocket disconnected");

// On message from ESP32
websocket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // For chart labels
  const timeLabel = getFormattedTime();


  const now = Date.now(); // current time in milliseconds

  // === Temperature & Humidity chart update every 5 seconds ===
  if (now - lastChartUpdate >= 5000) {
    if (tempElement) tempElement.textContent = `${data.temperature} °C`;
    if (tempChart) {
      tempData.labels.push(timeLabel);
      tempData.datasets[0].data.push(data.temperature);

      if (tempData.labels.length > MAX_POINTS) {
        tempData.labels.shift();
        tempData.datasets[0].data.shift();
      }
     
      tempChart.options.scales.y.suggestedMin = Math.min(...tempData.datasets[0].data) - 1;
      tempChart.options.scales.y.suggestedMax = Math.max(...tempData.datasets[0].data) + 1;
      tempChart.update();
      saveTempData();

       // === Update lifetime stats ===
        const newTemp = data.temperature;

        if (savedTempStats.min === null || newTemp < savedTempStats.min) {
          savedTempStats.min = newTemp;
        }
        if (savedTempStats.max === null || newTemp > savedTempStats.max) {
          savedTempStats.max = newTemp;
        }

        // Running sum + count for avg
        savedTempStats.sum += newTemp;
        savedTempStats.count += 1;

        // Calculate avg safely
        if (savedTempStats.count > 0) {
          savedTempStats.avg = (savedTempStats.sum / savedTempStats.count).toFixed(1);
        }

        // Update DOM
        if (minTempElement) minTempElement.textContent = `${savedTempStats.min} °C`;
        if (maxTempElement) maxTempElement.textContent = `${savedTempStats.max} °C`;
        if (avgTempElement) avgTempElement.textContent = `${savedTempStats.avg} °C`;

        // Save to localStorage
        localStorage.setItem("tempStats", JSON.stringify(savedTempStats));

    }

    if (humElement) humElement.textContent = `${data.humidity} %`;
    if (humChart) {
      humData.labels.push(timeLabel);
      humData.datasets[0].data.push(data.humidity);

      if (humData.labels.length > MAX_POINTS) {
        humData.labels.shift();
        humData.datasets[0].data.shift();
      }

      humChart.options.scales.y.suggestedMin = Math.min(...humData.datasets[0].data) - 1;
      humChart.options.scales.y.suggestedMax = Math.max(...humData.datasets[0].data) + 1;
      humChart.update();
      saveHumData();
    }

    lastChartUpdate = now;
  }

  // ✅ When new motion event arrives
  if (motionElement) {
    const status = data.motion === 1 ? "Detected" : "No Motion";
    motionElement.textContent = status;
    motionElement.style.color = (data.motion === 1) ? "#ff4c4c" : "#4caf50";

    // For motion logs
    const time = getFormattedTimeWithSeconds();

    const logEntry = `[${time}] ${status}`;

    let savedLogs = JSON.parse(localStorage.getItem("motionLogs")) || [];
    savedLogs.unshift({
      text: logEntry,
      bgColor: data.motion === 1 ? "#ffcccc" : "#d4f8d4"
    });
    if (savedLogs.length > 20) savedLogs.pop();
    localStorage.setItem("motionLogs", JSON.stringify(savedLogs));

    if (motionLogs) {
      const li = document.createElement("li");
      li.textContent = logEntry;
      li.style.color = "#000"; // Always black text
      li.style.backgroundColor = data.motion === 1 ? "#ffcccc" : "#d4f8d4";
      li.style.padding = "6px";
      li.style.borderRadius = "4px";
      li.style.marginBottom = "4px";

      motionLogs.prepend(li);
      if (motionLogs.children.length > 100) {
        motionLogs.removeChild(motionLogs.lastChild);
      }
    }
  }
  
  // Update active clients
  if (clientsCount) {
    clientsCount.textContent = data.clients || 0;
  }

// ✅ Sync LED state and mode
if (data.runLeds !== undefined) {
  ledRunning = data.runLeds === 1;

  if (ledRunning) {
    ledToggleButton.textContent = "Turn OFF";
    ledStatus.textContent = "Running...";
    ledStatus.className = "text-sm font-semibold px-3 py-1 rounded-full bg-blue-500 text-white shadow select-none";
  } else {
    ledToggleButton.textContent = "Turn ON";
    ledStatus.textContent = "OFF";
    ledStatus.className = "text-sm font-semibold px-3 py-1 rounded-full bg-gray-400 text-white shadow select-none";
  }
}

if (data.mode !== undefined) {
  currentMode = data.mode;
  modeDisplay.textContent = `Mode: ${currentMode}`;
}



//end websocket


};

// ✅ Clear Logs Button
const clearBtn = document.getElementById("clear-logs");
if (clearBtn && motionLogs) {
  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("motionLogs");
    motionLogs.innerHTML = "";
  });
}

// Toggle Button and Status
const ledToggleButton = document.getElementById("led-toggle");
const ledStatus = document.getElementById("led-status");

let ledRunning = false; // current LED state

if (ledToggleButton) {
  ledToggleButton.addEventListener("click", () => {
    if (ledRunning) {
      websocket.send("STOP_LEDS");
      ledToggleButton.textContent = "Turn ON";
      ledStatus.textContent = "OFF";
      ledStatus.className = "text-sm font-semibold px-3 py-1 rounded-full bg-gray-400 text-white shadow select-none";
    } else {
      websocket.send("RUN_LEDS");
      ledToggleButton.textContent = "Turn OFF";
      ledStatus.textContent = "Running...";
      ledStatus.className = "text-sm font-semibold px-3 py-1 rounded-full bg-blue-500 text-white shadow select-none";
    }
    ledRunning = !ledRunning; // toggle state
  });
}




// ✅ Memory Management
setInterval(() => {
  if (tempChart) {
    while (tempData.labels.length > MAX_POINTS) {
      tempData.labels.shift();
      tempData.datasets[0].data.shift();
    }
    tempChart.update();
    saveTempData();
  }

  if (humChart) {
    while (humData.labels.length > MAX_POINTS) {
      humData.labels.shift();
      humData.datasets[0].data.shift();
    }
    humChart.update();
    saveHumData();
  }
}, 1000 * 60 * 5); // every 30 sec


