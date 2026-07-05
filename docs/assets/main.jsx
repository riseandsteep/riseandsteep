const { useState, useEffect, useRef } = React;
const API = window.RAS_API || "https://rise-and-steep-api.riseandsteep.workers.dev";

// ── Data fetching ──────────────────────────────────────────────────────────────
async function fetchRooms() {
  const r = await fetch(`${API}/api/rooms`);
  return r.json();
}
async function fetchProducts(roomId) {
  const url = roomId ? `${API}/api/products?room=${roomId}&limit=100` : `${API}/api/products?limit=100`;
  const r = await fetch(url);
  const data = await r.json();
  return data.products || [];
}

// ── SVG Wheel helpers ──────────────────────────────────────────────────────────
function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function donutArc(cx, cy, ro, ri, s, e) {
  const p1 = polar(cx, cy, ro, s), p2 = polar(cx, cy, ro, e);
  const p3 = polar(cx, cy, ri, e), p4 = polar(cx, cy, ri, s);
  const la = e - s > 180 ? 1 : 0;
  const f = n => n.toFixed(2);
  return `M${f(p4.x)},${f(p4.y)}L${f(p1.x)},${f(p1.y)}A${ro},${ro},0,${la},1,${f(p2.x)},${f(p2.y)}L${f(p3.x)},${f(p3.y)}A${ri},${ri},0,${la},0,${f(p4.x)},${f(p4.y)}Z`;
}

// ── Goal Wheel ─────────────────────────────────────────────────────────────────
function GoalWheel({ rooms, active, onSelect }) {
  const [hov, setHov] = useState(null);
  const CX = 190, CY = 190, OR = 162, IR = 84, GAP = 3;
  const seg = rooms.length ? 360 / rooms.length : 60;
  const display = rooms.find(r => r.id === hov) || rooms.find(r => r.id === active) || null;

  if (!rooms.length) return (
    <svg width="380" height="380" viewBox="0 0 380 380">
      <circle cx={CX} cy={CY} r={OR} fill="#F4F4F5" />
      <text x={CX} y={CY} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize="13" fill="#A1A1AA">Loading...</text>
    </svg>
  );

  return (
    <svg width="380" height="380" viewBox="0 0 380 380" style={{ display: "block", overflow: "visible" }}>
      {rooms.map((room, i) => {
        const s = i * seg + GAP, e = (i + 1) * seg - GAP;
        const mid = i * seg + seg / 2;
        const isAct = active === room.id, isHov = hov === room.id;
        const lp = polar(CX, CY, (OR + IR) / 2 + 8, mid);
        const outerR = isAct || isHov ? OR + 12 : OR;
        const fill = isAct ? room.color : isHov ? room.color_accent : "#F4F4F5";
        const textFill = isAct || isHov ? "#fff" : "#52525B";
        const words = room.short.split(" ");

        return (
          React.createElement("g", {
            key: room.id,
            onMouseEnter: () => setHov(room.id),
            onMouseLeave: () => setHov(null),
            onClick: () => onSelect(isAct ? null : room.id),
            style: { cursor: "pointer" }
          },
            React.createElement("path", {
              d: donutArc(CX, CY, outerR, IR, s, e),
              fill, stroke: "#fff", strokeWidth: "3",
              style: { transition: "fill 0.2s ease" }
            }),
            React.createElement("text", {
              x: lp.x, y: lp.y + (words[1] ? -6 : 5),
              textAnchor: "middle",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "12", fontWeight: "700", fill: textFill,
              style: { pointerEvents: "none", userSelect: "none", transition: "fill 0.2s" }
            }, words[0]),
            words[1] && React.createElement("text", {
              x: lp.x, y: lp.y + 10,
              textAnchor: "middle",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "12", fontWeight: "700", fill: textFill,
              style: { pointerEvents: "none", userSelect: "none" }
            }, words[1])
          )
        );
      })}

      {React.createElement("circle", { cx: CX, cy: CY, r: IR - 12, fill: "#fff" })}
      {React.createElement("circle", { cx: CX, cy: CY, r: IR - 12, fill: "none", stroke: "#E4E4E7", strokeWidth: "1" })}

      {display ? React.createElement(React.Fragment, null,
        React.createElement("circle", { cx: CX, cy: CY, r: 10, fill: display.color }),
        React.createElement("text", { x: CX, y: CY + 26, textAnchor: "middle", fontFamily: "Space Grotesk, sans-serif", fontSize: "12", fontWeight: "700", fill: "#18181B" }, display.label),
        React.createElement("text", { x: CX, y: CY - 18, textAnchor: "middle", fontFamily: "Space Grotesk, sans-serif", fontSize: "9", fontWeight: "600", fill: "#D1D5DB", letterSpacing: "1" },
          active === display.id ? "SELECTED" : "CLICK TO SELECT"
        )
      ) : React.createElement(React.Fragment, null,
        React.createElement("text", { x: CX, y: CY - 7, textAnchor: "middle", fontFamily: "Space Grotesk, sans-serif", fontSize: "12", fontWeight: "500", fill: "#A1A1AA" }, "What are you"),
        React.createElement("text", { x: CX, y: CY + 11, textAnchor: "middle", fontFamily: "Space Grotesk, sans-serif", fontSize: "12", fontWeight: "500", fill: "#A1A1AA" }, "working on?")
      )}
    </svg>
  );
}

// ── Effect Bars ────────────────────────────────────────────────────────────────
function EffectBars({ product, color }) {
  const vals = [product.fx_energy, product.fx_calm, product.fx_focus, product.fx_digestion];
  const labels = ["E", "C", "F", "D"];
  return React.createElement("div", { style: { display: "flex", gap: 5, alignItems: "flex-end" } },
    vals.map((val, i) =>
      React.createElement("div", { key: i, title: `${["Energy","Calm","Focus","Digest"][i]}: ${val}/5`, style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 } },
        [5,4,3,2,1].map(pip =>
          React.createElement("div", { key: pip, style: { width: 5, height: 4, borderRadius: 1, background: pip <= val ? color : "#E4E4E7" } })
        ),
        React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 8, color: "#A1A1AA", marginTop: 2 } }, labels[i])
      )
    )
  );
}

// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product, color, accent, onAdd }) {
  const [added, setAdded] = useState(false);
  const price = (product.price_cents / 100).toFixed(2);

  function handleAdd(e) {
    e.stopPropagation();
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return React.createElement("div", {
    style: { background: "#fff", border: `1px solid ${color}33`, borderRadius: 12, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 10 }
  },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
      React.createElement("div", { style: { flex: 1, paddingRight: 8 } },
        React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 16, color: "#18181B" } }, product.name),
        React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A1A1AA", marginTop: 4 } }, product.tag || `${product.weight_oz}oz · ${product.caffeine} caffeine`)
      ),
      React.createElement(EffectBars, { product, color: accent })
    ),
    React.createElement("p", { style: { fontFamily: "Inter, sans-serif", fontSize: 13, color: "#52525B", lineHeight: 1.5, margin: 0 } }, product.blurb),
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 } },
      React.createElement("span", { style: { fontFamily: "Space Grotesk, sans-serif", fontSize: 16, fontWeight: 700, color: "#18181B" } }, `$${price}`),
      React.createElement("button", {
        onClick: handleAdd,
        style: { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, padding: "8px 16px", borderRadius: 999, cursor: "pointer", border: "none", background: added ? color : accent, color: "#fff", transition: "background 0.2s" }
      }, added ? "Added" : "Add to cart")
    )
  );
}

// ── Cart Drawer ────────────────────────────────────────────────────────────────
function CartDrawer({ cart, onClose, onRemove, onQty }) {
  const total = cart.reduce((s, i) => s + (i.price_cents / 100) * i.qty, 0);
  return React.createElement("div", {
    style: { position: "absolute", top: 0, right: 0, width: 340, background: "#fff", borderLeft: "1px solid #E4E4E7", minHeight: "100%", padding: 24, zIndex: 40, boxSizing: "border-box" }
  },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 } },
      React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 18, color: "#18181B" } }, "Your cart"),
      React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", fontSize: 20, color: "#A1A1AA", cursor: "pointer" } }, "×")
    ),
    cart.length === 0
      ? React.createElement("p", { style: { fontFamily: "Inter, sans-serif", fontSize: 13, color: "#A1A1AA" } }, "Nothing added yet.")
      : React.createElement(React.Fragment, null,
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } },
            cart.map(item =>
              React.createElement("div", { key: item.id, style: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid #F4F4F5", paddingBottom: 14 } },
                React.createElement("div", null,
                  React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, fontSize: 13, color: "#18181B" } }, item.name),
                  React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A1A1AA", marginTop: 3 } }, `$${(item.price_cents / 100).toFixed(2)} each`),
                  React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } },
                    React.createElement("button", { onClick: () => onQty(item.id, -1), style: { width: 24, height: 24, borderRadius: 6, border: "1px solid #E4E4E7", background: "transparent", cursor: "pointer", fontSize: 13 } }, "−"),
                    React.createElement("span", { style: { fontFamily: "Inter, sans-serif", fontSize: 13 } }, item.qty),
                    React.createElement("button", { onClick: () => onQty(item.id, 1), style: { width: 24, height: 24, borderRadius: 6, border: "1px solid #E4E4E7", background: "transparent", cursor: "pointer", fontSize: 13 } }, "+")
                  )
                ),
                React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between" } },
                  React.createElement("span", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 14 } }, `$${((item.price_cents / 100) * item.qty).toFixed(2)}`),
                  React.createElement("button", { onClick: () => onRemove(item.id), style: { background: "none", border: "none", fontSize: 11, color: "#A1A1AA", cursor: "pointer" } }, "Remove")
                )
              )
            )
          ),
          React.createElement("div", { style: { borderTop: "1px solid #E4E4E7", paddingTop: 16, marginTop: 12 } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 16, color: "#18181B", marginBottom: 14 } },
              React.createElement("span", null, "Subtotal"),
              React.createElement("span", null, `$${total.toFixed(2)}`)
            ),
            React.createElement("button", {
              style: { width: "100%", padding: 14, borderRadius: 999, border: "none", background: "#18181B", color: "#fff", fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer" }
            }, "Checkout — coming soon")
          )
        )
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
function App() {
  const [rooms, setRooms] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const roomRef = useRef(null);

  useEffect(() => {
    fetchRooms().then(data => {
      setRooms(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
    fetchProducts(null).then(data => setProducts(data));
  }, []);

  function selectRoom(id) {
    setActiveRoom(id);
    if (id) setTimeout(() => roomRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function addToCart(product) {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const currentRoom = rooms.find(r => r.id === activeRoom) || null;
  const roomProducts = currentRoom ? products.filter(p => p.room_id === activeRoom) : products;

  if (loading) return React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Space Grotesk, sans-serif", fontSize: 18, color: "#A1A1AA" } }, "Rise & Steep");

  return React.createElement("div", { style: { background: "#fff", minHeight: "100vh", position: "relative" } },

    // NAV
    React.createElement("nav", { style: { background: "#fff", borderBottom: "1px solid #E4E4E7", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", position: "sticky", top: 0, zIndex: 30 } },
      React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 20, color: "#18181B", letterSpacing: "-0.5px" } }, "Rise & Steep"),
      React.createElement("div", { style: { display: "flex", gap: 28, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#52525B" } },
        ["Shop", "About", "Wholesale"].map(n => React.createElement("span", { key: n, style: { cursor: "pointer" } }, n))
      ),
      React.createElement("button", {
        onClick: () => setCartOpen(!cartOpen),
        style: { display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 13, border: "1px solid #E4E4E7", borderRadius: 999, padding: "8px 16px", background: "#fff", cursor: "pointer", color: "#18181B" }
      },
        "Cart",
        React.createElement("span", { style: { background: "#18181B", color: "#fff", borderRadius: 999, fontSize: 11, minWidth: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 4px" } }, cartCount)
      )
    ),

    // HERO
    React.createElement("section", { style: { maxWidth: 1100, margin: "0 auto", padding: "56px 24px 52px", display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" } },
      React.createElement("div", { style: { flex: "1 1 360px", minWidth: 300 } },
        React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, color: "#A1A1AA", marginBottom: 18 } }, "HERBAL TEA FOR PERFORMANCE"),
        React.createElement("h1", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "clamp(42px,5.5vw,68px)", color: "#18181B", lineHeight: 0.95, margin: 0, letterSpacing: "-2px" } },
          "Steep toward", React.createElement("br", null),
          React.createElement("span", { style: { color: "#A1A1AA" } }, "optimal.")
        ),
        React.createElement("p", { style: { fontFamily: "Inter, sans-serif", fontSize: 16, color: "#52525B", lineHeight: 1.65, marginTop: 22, maxWidth: 400 } },
          "Tell us what you're working on. The wheel takes you straight to blends built for that goal."
        ),
        React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" } },
          ["No seed oils", "No fillers", "100% herbal", "Lab-sourced"].map(tag =>
            React.createElement("div", { key: tag, style: { fontFamily: "Inter, sans-serif", fontSize: 12, color: "#71717A", border: "1px solid #E4E4E7", borderRadius: 999, padding: "5px 12px" } }, tag)
          )
        ),
        React.createElement("div", { style: { marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 } },
          rooms.map(room =>
            React.createElement("button", {
              key: room.id,
              onClick: () => selectRoom(room.id),
              style: { fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${activeRoom === room.id ? room.color : "#E4E4E7"}`, background: activeRoom === room.id ? room.color_light : "transparent", color: activeRoom === room.id ? room.color_dark : "#52525B", transition: "all 0.15s" }
            }, room.label)
          )
        )
      ),
      React.createElement("div", { style: { flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center" } },
        React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 11, color: "#A1A1AA", letterSpacing: 1.5, marginBottom: 10, textAlign: "center" } }, "SELECT YOUR GOAL"),
        React.createElement(GoalWheel, { rooms, active: activeRoom, onSelect: selectRoom }),
        activeRoom && React.createElement("button", {
          onClick: () => setActiveRoom(null),
          style: { marginTop: 10, background: "none", border: "none", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#A1A1AA", cursor: "pointer" }
        }, "Clear selection ×")
      )
    ),

    // STATS STRIP
    React.createElement("div", { style: { borderTop: "1px solid #E4E4E7", borderBottom: "1px solid #E4E4E7", padding: "16px 24px" } },
      React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap" } },
        [["12", "Active Blends"], ["6", "Wellness Goals"], ["100%", "Loose Leaf Herb"], ["0", "Fillers or Binders"]].map(([num, label], i) =>
          React.createElement("div", { key: i, style: { flex: "1 1 160px", padding: "0 24px", borderRight: i < 3 ? "1px solid #E4E4E7" : "none" } },
            React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 22, color: "#18181B" } }, num),
            React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 12, color: "#A1A1AA", marginTop: 2 } }, label)
          )
        )
      )
    ),

    // ROOM SECTION
    React.createElement("div", { ref: roomRef },
      currentRoom && React.createElement("div", { style: { borderTop: `4px solid ${currentRoom.color}`, background: currentRoom.color_light, padding: "44px 24px 52px" } },
        React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 } },
            React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: currentRoom.color } }),
            React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontSize: 11, fontWeight: 700, color: currentRoom.color_dark, letterSpacing: 2 } }, `${currentRoom.label.toUpperCase()} BLENDS`)
          ),
          React.createElement("h2", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "clamp(26px,4vw,38px)", color: "#18181B", margin: "0 0 6px", letterSpacing: "-0.5px" } }, `Built for ${currentRoom.label.toLowerCase()}.`),
          React.createElement("p", { style: { fontFamily: "Inter, sans-serif", fontSize: 15, color: "#52525B", margin: "0 0 32px", maxWidth: 520 } }, currentRoom.sub),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 } },
            roomProducts.map(p => React.createElement(ProductCard, { key: p.id, product: p, color: currentRoom.color, accent: currentRoom.color_accent, onAdd: addToCart }))
          )
        )
      )
    ),

    // ALL BLENDS
    !activeRoom && React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", padding: "44px 24px 56px" } },
      React.createElement("div", { style: { borderBottom: "1px solid #E4E4E7", paddingBottom: 20, marginBottom: 28 } },
        React.createElement("h2", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 22, color: "#18181B", margin: 0 } }, "All blends"),
        React.createElement("p", { style: { fontFamily: "Inter, sans-serif", fontSize: 13, color: "#A1A1AA", margin: "6px 0 0" } }, "Select a goal on the wheel above to navigate by what you need.")
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 14 } },
        products.map(p => {
          const room = rooms.find(r => r.id === p.room_id) || { color: "#18181B", color_accent: "#52525B" };
          return React.createElement(ProductCard, { key: p.id, product: p, color: room.color, accent: room.color_accent, onAdd: addToCart });
        })
      )
    ),

    // ABOUT
    React.createElement("div", { style: { background: "#18181B", padding: "60px 24px" } },
      React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", display: "flex", gap: 48, flexWrap: "wrap", alignItems: "center" } },
        React.createElement("div", { style: { flex: "1 1 420px" } },
          React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#52525B", marginBottom: 16 } }, "ABOUT RISE & STEEP"),
          React.createElement("h2", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: "clamp(28px,4vw,44px)", color: "#F4F4F5", lineHeight: 1.05, margin: 0, letterSpacing: "-1px" } }, "Every blend starts with a question: what do you actually need today?")
        ),
        React.createElement("p", { style: { flex: "1 1 320px", fontFamily: "Inter, sans-serif", fontSize: 15, color: "#71717A", lineHeight: 1.65, margin: 0, maxWidth: 420 } },
          "We source whole herbs in bulk, blend them around measurable effect profiles, and package them without fillers or fluff. No wellness theater. Just what works."
        )
      )
    ),

    // FOOTER
    React.createElement("footer", { style: { borderTop: "1px solid #E4E4E7", padding: "28px 24px" } },
      React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 } },
        React.createElement("div", { style: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 16, color: "#18181B" } }, "Rise & Steep"),
        React.createElement("div", { style: { fontFamily: "Inter, sans-serif", fontSize: 12, color: "#A1A1AA" } }, "riseandsteep.com · Herbal tea for performance")
      )
    ),

    // CART
    cartOpen && React.createElement(React.Fragment, null,
      React.createElement("div", { onClick: () => setCartOpen(false), style: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 39 } }),
      React.createElement(CartDrawer, {
        cart,
        onClose: () => setCartOpen(false),
        onRemove: id => setCart(prev => prev.filter(i => i.id !== id)),
        onQty: (id, d) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0))
      })
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
