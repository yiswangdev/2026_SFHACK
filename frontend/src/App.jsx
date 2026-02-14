import { useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";
import "./App.css";

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }; // US center
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

export default function App() {
  const [query, setQuery] = useState("San Francisco, CA");
  const [radiusKm, setRadiusKm] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const [filterBy, setFilterBy] = useState("");

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [places, setPlaces] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  const selectedPlace = useMemo(
    () => places.find((p) => p.id === selectedId) || null,
    [places, selectedId]
  );

  const apiBase = import.meta.env.VITE_API_BASE || "";
  const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: browserKey,
  });

  const onSearch = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    setSelectedId(null);

    try {
      const rMeters = Math.max(1000, Math.min(50000, Math.round(radiusKm * 1000)));
      const url = `${apiBase}/api/search?q=${encodeURIComponent(query)}&radius=${rMeters}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Search failed");

      setCenter(data.center || DEFAULT_CENTER);
      setPlaces(data.places || []);
      if (!data.places?.length) setError("No results found. Try a different search or larger radius.");
    } catch (err) {
      setError(err?.message || "Something went wrong");
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // optional initial search
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page">
      <header className="header">
        <div className="brand">
          <div className="logoMark">♻️</div>
          <div>
            <h1>SecondLife Finder</h1>
            <p>Find thrift stores, donation centers, and exchange options near you.</p>
          </div>
        </div>

        <form className="searchBar" onSubmit={onSearch}>
          <div className="inputGroup">
            <label>City / ZIP / State</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 94103 or Austin, TX"
            />
          </div>

          <div className="inputGroup small">
            <label>Radius (km)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
            />
          </div>

          <button className="btn" disabled={loading || !query.trim()}>
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {!browserKey ? (
          <div className="alert">
            Missing <code>VITE_GOOGLE_MAPS_BROWSER_KEY</code> in <code>client/.env</code>
          </div>
        ) : null}

        {error ? <div className="alert">{error}</div> : null}
      </header>

      <main className="content">
        <section className="mapCard">
          <div className="cardHeader">
            <h2>Map</h2>
            <p>Markers show the results found for your search.</p>
          </div>

          <div className="mapWrap">
            {loadError ? (
              <div className="mapFallback">Map failed to load.</div>
            ) : !isLoaded ? (
              <div className="mapFallback">Loading map…</div>
            ) : (
              <GoogleMap
                center={center}
                zoom={12}
                mapContainerStyle={MAP_CONTAINER_STYLE}
                options={{
                  fullscreenControl: false,
                  streetViewControl: false,
                  mapTypeControl: false,
                }}
              >
                {places.map((p) => (
                  <Marker
                    key={p.id}
                    position={{ lat: p.lat, lng: p.lng }}
                    onClick={() => setSelectedId(p.id)}
                  />
                ))}

                {selectedPlace ? (
                  <InfoWindow
                    position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                    onCloseClick={() => setSelectedId(null)}
                  >
                    <div className="infoWindow">
                      <div className="infoTitle">{selectedPlace.name}</div>
                      <div className="infoMeta">{selectedPlace.address}</div>

                      <div className="infoRow">
                        <Badge>{selectedPlace.category}</Badge>
                        {selectedPlace.rating != null ? (
                          <span className="rating">
                            ⭐ {selectedPlace.rating}{" "}
                            {selectedPlace.ratingCount ? `(${selectedPlace.ratingCount})` : ""}
                          </span>
                        ) : null}
                      </div>

                      <div className="infoLinks">
                        {selectedPlace.mapsUrl ? (
                          <a href={selectedPlace.mapsUrl} target="_blank" rel="noreferrer">
                            Open in Google Maps
                          </a>
                        ) : null}
                        {selectedPlace.website ? (
                          <a href={selectedPlace.website} target="_blank" rel="noreferrer">
                            Website
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </InfoWindow>
                ) : null}
              </GoogleMap>
            )}
          </div>
        </section>

        <section className="resultsCard">
          <div className="cardHeader" id="resultsHeader">
            <div>
              <h2>Results</h2>
              <p>{places.length ? `${places.length} places found` : "Search to see places"}</p>
            </div>

            <div className="menuControls">
              <h2>Filter By:</h2>
              <select className="selectMenu" value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
                <option value="">All Categories</option>
                <option value="Thrift Store">Thrift Stores</option>
                <option value="Donation Center">Donation Centers</option>
                <option value="Exchange Event">Exchange Events</option>
              </select>
            </div>

            <div className="menuControls">
              <h2>Sort By:</h2>
              <select className="selectMenu" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="relevance">Relevance</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>

          <div className="results">
            {[...places]
            .filter((p) => (filterBy === "All Categories" || p.category.includes(filterBy)))
            .sort((a, b) => {
              if (sortBy === "rating") {
                return (b.rating || 0) - (a.rating || 0);
              }
              else{
                return 0; // default order (relevance)
              }
            })
            .map((p) => (
              <button
                key={p.id}
                className={`resultRow ${p.id === selectedId ? "active" : ""}`}
                onClick={() => {
                  setSelectedId(p.id);
                  setCenter({ lat: p.lat, lng: p.lng });
                }}
              >
                <div className="resultTop">
                  <div className="resultName">{p.name}</div>
                  <Badge>{p.category}</Badge>
                </div>

                <div className="resultAddress">{p.address}</div>

                <div className="resultBottom">
                  {p.rating != null ? (
                    <span className="rating">
                      ⭐ {p.rating} {p.ratingCount ? `(${p.ratingCount})` : ""}
                    </span>
                  ) : (
                    <span className="muted">No rating</span>
                  )}
                  <span className="muted">{p.phone || ""}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>Donate, thrift, and swap to keep textiles out of landfills.</span>
      </footer>
    </div>
  );
}
