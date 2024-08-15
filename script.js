var map = L.map('map').setView([16.8409, 96.1735], 12);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map);

var markers = {};
var currentStation = null;

// Load gas station data from external JSON file
fetch('stations.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        var gasStations = data.features.map(feature => {
            return {
                id: feature.properties.id,
                name: feature.properties['name:en'],
                lat: feature.geometry.coordinates[1],
                lon: feature.geometry.coordinates[0],
                feedbacks: JSON.parse(localStorage.getItem('feedbacks_' + feature.properties.id)) || [],
                status: "blue"
            };
        });

        gasStations.forEach(function(station) {
            var marker = L.circleMarker([station.lat, station.lon], {
                color: station.status,
                radius: 10
            }).addTo(map);

            marker.bindPopup(station.name);

            marker.on('click', function () {
                showStatusBox(station);
            });

            markers[station.id] = marker;
        });
    })
    .catch(error => {
        console.error('Error fetching the gas station data:', error);
    });

function showStatusBox(station) {
    var feedbackList = document.getElementById('feedbackList');
    feedbackList.innerHTML = '';

    // Load stored feedbacks for the station from localStorage
    var storedFeedbacks = JSON.parse(localStorage.getItem('feedbacks_' + station.id)) || [];
    station.feedbacks = storedFeedbacks;

    // Display the station name in the status box
    var stationName = document.createElement('h3');
    stationName.textContent = station.name;
    feedbackList.appendChild(stationName);

    station.feedbacks.slice().reverse().forEach(function (feedback) {
        var div = document.createElement('div');
        div.className = 'feedback-item';
        var timestamp = new Date(feedback.timestamp);
        div.innerHTML = `<span>${feedback.text} (${feedback.type})</span> <span>${timestamp.toLocaleString()}</span>`;
        feedbackList.appendChild(div);
    });

    document.getElementById('statusBox').style.display = 'block';

    currentStation = station;
}

function submitFeedback(type) {
    if (!currentStation) return;

    var feedbackText = document.getElementById('feedbackText').value;
    if (feedbackText.trim() === '') return;

    // Add new feedback to the station's feedbacks array
    currentStation.feedbacks.push({
        text: feedbackText,
        type: type,
        timestamp: new Date().toISOString()
    });

    // Keep only the last 10 feedbacks
    if (currentStation.feedbacks.length > 10) {
        currentStation.feedbacks.shift();
    }

    // Save the feedbacks to localStorage
    localStorage.setItem('feedbacks_' + currentStation.id, JSON.stringify(currentStation.feedbacks));

    // Update the marker color based on feedback type
    if (type === 'positive') {
        currentStation.status = 'green';
    } else if (type === 'negative') {
        currentStation.status = 'red';
    }
    markers[currentStation.id].setStyle({ color: currentStation.status });

    showStatusBox(currentStation);

    // Clear the input field
    document.getElementById('feedbackText').value = '';
}

// Locate Me function
function locateMe() {
    map.locate({setView: true, maxZoom: 16});

    function onLocationFound(e) {
        var radius = e.accuracy / 2;

        // Add a marker at the user's location
        L.marker(e.latlng).addTo(map)
            .bindPopup("You are within " + radius + " meters from this point").openPopup();

        // Draw a circle around the user's location
        L.circle(e.latlng, radius).addTo(map);
    }

    function onLocationError(e) {
        alert(e.message);
    }

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
}

// Attach the Locate Me function to the button
document.getElementById('locateMeBtn').onclick = locateMe;

// Optional: Clear feedbacks from localStorage for the current station
function clearFeedbacks() {
    if (currentStation) {
        localStorage.removeItem('feedbacks_' + currentStation.id);
        currentStation.feedbacks = [];
        showStatusBox(currentStation);
    }
}
