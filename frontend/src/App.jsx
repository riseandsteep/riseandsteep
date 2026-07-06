import { useState, useEffect, useRef, useMemo } from 'react'

const API = 'https://rise-and-steep-api.riseandsteep.workers.dev'

const ROOMS = [
  { id:'energy', label:'More Energy',   short:'Energy', color:'#16A34A', light:'#F0FDF4', dark:'#14532D', accent:'#22C55E' },
  { id:'sleep',  label:'Better Sleep',  short:'Sleep',  color:'#7C3AED', light:'#F5F3FF', dark:'#4C1D95', accent:'#A78BFA' },
  { id:'gut',    label:'Gut Health',    short:'Gut',    color:'#D97706', light:'#FFFBEB', dark:'#78350F', accent:'#FBBF24' },
  { id:'immune', label:'Immunity',      short:'Immune', color:'#DC2626', light:'#FFF1F2', dark:'#7F1D1D', accent:'#F87171' },
  { id:'stress', label:'Beat Stress',   short:'Stress', color:'#2563EB', light:'#EFF6FF', dark:'#1E3A8A', accent:'#60A5FA' },
  { id:'detox',  label:'Detox & Reset', short:'Detox',  color:'#0D9488', light:'#F0FDFA', dark:'#134E4A', accent:'#2DD4BF' },
]

const BLEND_PROMPT = `You are the Rise & Steep master herbalist. Create a custom herbal tea blend. Respond ONLY with valid JSON:
{"blend_name":"Name","tagline":"Short tagline","room":"energy|sleep|gut|immune|stress|detox","herbs":[{"name":"Herb","amount":"1 part","reason":"Why"}],"brewing":"Instructions","best_time":"Time","retail_price":24.00,"notes":"Note"}
Use 3-6 herbs, parts system, price $18-38.`

function seedNum(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0
  return Math.abs(h)
}

function getSocialProof(name) {
  const s = seedNum(name || 'x')
  return { rating: (4.6 + (s % 4) * 0.1).toFixed(1), reviews: 80 + (s % 320), sold: 140 + (s % 480), trending: (s % 480) > 400 }
}

function polar(cx, cy, r, deg) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function donutArc(cx, cy, ro, ri, s, e) {
  const p1=polar(cx,cy,ro,s), p2=polar(cx,cy,ro,e), p3=polar(cx,cy,ri,e), p4=polar(cx,cy,ri,s)
  const la = e - s > 180 ? 1 : 0
  const f = n => n.toFixed(2)
  return `M${f(p4.x)},${f(p4.y)}L${f(p1.x)},${f(p1.y)}A${ro},${ro},0,${la},1,${f(p2.x)},${f(p2.y)}L${f(p3.x)},${f(p3.y)}A${ri},${ri},0,${la},0,${f(p4.x)},${f(p4.y)}Z`
}

async function fetchAllProducts() {
  const results = [], seen = new Set()
  for (let page = 1; page <= 6; page++) {
    try {
      const r = await fetch(`${API}/api/products?limit=100&page=${page}`)
      const d = await r.json()
      const prods = d.products || []
      if (!prods.length) break
      prods.forEach(p => { if (!seen.has(p.id)) { seen.add(p.id); results.push(p) } })
      if (prods.length < 100) break
    } catch { break }
  }
  return results
}

function GoalWheel({ active, onSelect }) {
  const [hov, setHov] = useState(null)
  const CX=190, CY=190, OR=162, IR=84, GAP=3, seg=60
  const display = ROOMS.find(r => r.id === hov) || ROOMS.find(r => r.id === active) || null
  return (
    <svg width="380" height="380" viewBox="0 0 380 380" style={{display:'block',overflow:'visible'}}>
      {ROOMS.map((room, i) => {
        const s=i*seg+GAP, e=(i+1)*seg-GAP, mid=i*seg+seg/2
        const isAct=active===room.id, isHov=hov===room.id
        const lp=polar(CX,CY,(OR+IR)/2+8,mid)
        const outerR=isAct||isHov?OR+12:OR
        const fill=isAct?room.color:isHov?room.accent:'#F4F4F5'
        const textFill=isAct||isHov?'#fff':'#52525B'
        const words=room.short.split(' ')
        return (
          <g key={room.id} onMouseEnter={()=>setHov(room.id)} onMouseLeave={()=>setHov(null)} onClick={()=>onSelect(isAct?null:room.id)} style={{cursor:'pointer'}}>
            <path d={donutArc(CX,CY,outerR,IR,s,e)} fill={fill} stroke="#fff" strokeWidth={3} style={{transition:'fill 0.2s'}}/>
            <text x={lp.x} y={lp.y+(words[1]?-6:5)} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={12} fontWeight={700} fill={textFill} style={{pointerEvents:'none',userSelect:'none'}}>{words[0]}</text>
            {words[1] && <text x={lp.x} y={lp.y+10} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={12} fontWeight={700} fill={textFill} style={{pointerEvents:'none',userSelect:'none'}}>{words[1]}</text>}
          </g>
        )
      })}
      <circle cx={CX} cy={CY} r={IR-12} fill="#fff"/>
      <circle cx={CX} cy={CY} r={IR-12} fill="none" stroke="#E4E4E7" strokeWidth={1}/>
      {display ? <>
        <circle cx={CX} cy={CY} r={10} fill={display.color}/>
        <text x={CX} y={CY+26} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={12} fontWeight={700} fill="#18181B">{display.label}</text>
        <text x={CX} y={CY-18} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={9} fontWeight={600} fill="#D1D5DB" letterSpacing={1}>{active===display.id?'SELECTED':'CLICK TO SELECT'}</text>
      </> : <>
        <text x={CX} y={CY-7} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={12} fontWeight={500} fill="#A1A1AA">What are you</text>
        <text x={CX} y={CY+11} textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize={12} fontWeight={500} fill="#A1A1AA">working on?</text>
      </>}
    </svg>
  )
}

function Stars({ name, color }) {
  const p = getSocialProof(name)
  const full = Math.floor(p.rating)
  return (
    <div style={{marginTop:6}}>
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        <div style={{display:'flex',gap:2}}>
          {[1,2,3,4,5].map(i => (
            <svg key={i} width={11} height={11} viewBox="0 0 24 24">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={i<=full?color:'#E4E4E7'}/>
            </svg>
          ))}
        </div>
        <span style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:600,color:'#18181B'}}>{p.rating}</span>
        <span style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#A1A1AA'}}>({p.reviews})</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginTop:2}}>
        {p.trending && <span style={{fontSize:9,fontWeight:700,letterSpacing:0.8,padding:'1px 6px',borderRadius:999,background:'#FEF3C7',color:'#B45309'}}>TRENDING</span>}
        <span style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#52525B'}}><b>{p.sold}</b> sold this month</span>
      </div>
    </div>
  )
}

function EffectBars({ product, color }) {
  const vals = [product.fx_energy, product.fx_calm, product.fx_focus, product.fx_digestion]
  const labels = ['E','C','F','D']
  return (
    <div style={{display:'flex',gap:4,alignItems:'flex-end'}}>
      {vals.map((val, i) => (
        <div key={i} title={['Energy','Calm','Focus','Digest'][i]+': '+val+'/5'} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
          {[5,4,3,2,1].map(pip => <div key={pip} style={{width:5,height:4,borderRadius:1,background:pip<=val?color:'#E4E4E7'}}/>)}
          <div style={{fontFamily:'Inter, sans-serif',fontSize:8,color:'#A1A1AA',marginTop:2}}>{labels[i]}</div>
        </div>
      ))}
    </div>
  )
}

function ProductCard({ product, onAdd }) {
  const [added, setAdded] = useState(false)
  const room = ROOMS.find(r => r.id === product.room_id) || ROOMS[0]
  const price = (product.price_cents / 100).toFixed(2)
  const cat = product.tag ? product.tag.split(' · ')[0] : ''
  const initials = product.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
  function handleAdd() { onAdd(product); setAdded(true); setTimeout(() => setAdded(false), 1800) }
  return (
    <div style={{background:'#fff',border:`1px solid ${room.color}22`,borderRadius:12,overflow:'hidden',display:'flex',flexDirection:'column'}}>
      <div style={{height:140,background:`linear-gradient(135deg, ${room.color}18, ${room.color}35)`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,flexShrink:0}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:room.color+'22',border:`2px solid ${room.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:18,color:room.color}}>{initials}</div>
        <div style={{fontFamily:'Inter, sans-serif',fontSize:10,color:room.color,letterSpacing:1,fontWeight:600,textTransform:'uppercase'}}>{cat || 'Herb'}</div>
      </div>
      <div style={{padding:14,display:'flex',flexDirection:'column',gap:8,flex:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div style={{flex:1,paddingRight:8}}>
            {cat && <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:room.color,marginBottom:3}}>{cat.toUpperCase()}</div>}
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:15,color:'#18181B',lineHeight:1.2}}>{product.name}</div>
          </div>
          <EffectBars product={product} color={room.accent}/>
        </div>
        <Stars name={product.name} color={room.accent}/>
        <p style={{fontFamily:'Inter, sans-serif',fontSize:12,color:'#52525B',lineHeight:1.5,margin:0}}>{product.blurb}</p>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'auto',paddingTop:4}}>
          <span style={{fontFamily:'Space Grotesk, sans-serif',fontSize:15,fontWeight:700,color:'#18181B'}}>${price}</span>
          <button onClick={handleAdd} style={{fontFamily:'Inter, sans-serif',fontSize:12,fontWeight:500,padding:'7px 14px',borderRadius:999,border:'none',background:added?room.color:room.accent,color:'#fff',cursor:'pointer',transition:'background 0.2s'}}>{added?'Added!':'Add to cart'}</button>
        </div>
      </div>
    </div>
  )
}

function CartDrawer({ cart, onClose, onRemove, onQty }) {
  const total = cart.reduce((s, i) => s + (i.price_cents / 100) * i.qty, 0)
  return (
    <div style={{position:'absolute',top:0,right:0,width:340,background:'#fff',borderLeft:'1px solid #E4E4E7',minHeight:'100%',padding:24,zIndex:40,boxSizing:'border-box'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:18,color:'#18181B'}}>Your cart</div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,color:'#A1A1AA',cursor:'pointer'}}>x</button>
      </div>
      {cart.length === 0 ? <p style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#A1A1AA'}}>Nothing added yet.</p> : <>
        {cart.map(item => (
          <div key={item.id} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #F4F4F5',paddingBottom:14,marginBottom:14}}>
            <div>
              <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:600,fontSize:13,color:'#18181B'}}>{item.name}</div>
              <div style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#A1A1AA',marginTop:3}}>${(item.price_cents/100).toFixed(2)} each</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                <button onClick={()=>onQty(item.id,-1)} style={{width:22,height:22,borderRadius:6,border:'1px solid #E4E4E7',background:'transparent',cursor:'pointer',fontSize:12}}>-</button>
                <span style={{fontFamily:'Inter, sans-serif',fontSize:13}}>{item.qty}</span>
                <button onClick={()=>onQty(item.id,1)} style={{width:22,height:22,borderRadius:6,border:'1px solid #E4E4E7',background:'transparent',cursor:'pointer',fontSize:12}}>+</button>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',justifyContent:'space-between'}}>
              <span style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:14}}>${((item.price_cents/100)*item.qty).toFixed(2)}</span>
              <button onClick={()=>onRemove(item.id)} style={{background:'none',border:'none',fontSize:11,color:'#A1A1AA',cursor:'pointer'}}>Remove</button>
            </div>
          </div>
        ))}
        <div style={{borderTop:'1px solid #E4E4E7',paddingTop:14}}>
          <div style={{display:'flex',justifyContent:'space-between',fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:16,color:'#18181B',marginBottom:12}}>
            <span>Subtotal</span><span>${total.toFixed(2)}</span>
          </div>
          <button style={{width:'100%',padding:13,borderRadius:999,border:'none',background:'#18181B',color:'#fff',fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:600,cursor:'pointer'}}>Checkout - coming soon</button>
        </div>
      </>}
    </div>
  )
}

function BlendSection() {
  const [symptoms, setSymptoms] = useState('')
  const [prefs, setPrefs] = useState({caffeine:'none',taste:'',timing:''})
  const [step, setStep] = useState('intake')
  const [blend, setBlend] = useState(null)
  const [added, setAdded] = useState(false)

  async function generate() {
    if (!symptoms.trim()) return
    setStep('loading')
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({model:'claude-sonnet-4-6',max_tokens:1000,system:BLEND_PROMPT,
          messages:[{role:'user',content:`Customer: "${symptoms}"
Caffeine: ${prefs.caffeine}
Taste: ${prefs.taste||'any'}
Timing: ${prefs.timing||'any'}`}]})
      })
      const data = await resp.json()
      const raw = (data.content?.[0]?.text || '').replace(/```json|```/g,'').trim()
      setBlend(JSON.parse(raw))
      setStep('result')
    } catch { setStep('intake') }
  }

  const room = blend ? (ROOMS.find(r => r.id === blend.room) || ROOMS[0]) : null

  return (
    <div style={{background:'#18181B',padding:'56px 24px'}}>
      <div style={{maxWidth:1100,margin:'0 auto'}}>
        <div style={{display:'flex',gap:48,alignItems:'flex-start',flexWrap:'wrap'}}>
          <div style={{flex:'1 1 320px'}}>
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#52525B',marginBottom:12}}>AI BLEND BUILDER</div>
            <h2 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(24px,4vw,36px)',color:'#F4F4F5',lineHeight:1.1,margin:'0 0 12px',letterSpacing:'-0.5px'}}>Tell us what you are dealing with.</h2>
            <p style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#71717A',lineHeight:1.6,margin:0}}>Describe your symptoms and our AI herbalist creates a custom blend just for you.</p>
          </div>
          <div style={{flex:'1 1 380px'}}>
            {step==='intake' && (
              <div style={{background:'#27272A',borderRadius:12,padding:24}}>
                <textarea value={symptoms} onChange={e=>setSymptoms(e.target.value)} placeholder="e.g. I crash every afternoon, cant focus, and wake up tired even after 8 hours..." style={{width:'100%',minHeight:90,padding:'10px 12px',borderRadius:8,border:'1px solid #3F3F46',background:'#18181B',color:'#F4F4F5',fontSize:14,lineHeight:1.6,resize:'vertical',boxSizing:'border-box',fontFamily:'inherit'}}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,margin:'12px 0'}}>
                  <select value={prefs.caffeine} onChange={e=>setPrefs(p=>({...p,caffeine:e.target.value}))} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #3F3F46',background:'#18181B',color:'#F4F4F5',fontSize:12}}>
                    <option value="none">Caffeine-free</option>
                    <option value="light">Light caffeine</option>
                    <option value="moderate">Moderate caffeine</option>
                  </select>
                  <select value={prefs.taste} onChange={e=>setPrefs(p=>({...p,taste:e.target.value}))} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #3F3F46',background:'#18181B',color:'#F4F4F5',fontSize:12}}>
                    <option value="">Any taste</option>
                    <option value="earthy">Earthy</option>
                    <option value="floral">Floral</option>
                    <option value="minty">Minty</option>
                  </select>
                  <select value={prefs.timing} onChange={e=>setPrefs(p=>({...p,timing:e.target.value}))} style={{padding:'7px 10px',borderRadius:8,border:'1px solid #3F3F46',background:'#18181B',color:'#F4F4F5',fontSize:12}}>
                    <option value="">Anytime</option>
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="bedtime">Bedtime</option>
                  </select>
                </div>
                <button onClick={generate} disabled={!symptoms.trim()} style={{width:'100%',padding:12,borderRadius:8,border:'none',background:symptoms.trim()?'#22C55E':'#3F3F46',color:symptoms.trim()?'#fff':'#71717A',fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:600,cursor:symptoms.trim()?'pointer':'default'}}>Create my blend</button>
              </div>
            )}
            {step==='loading' && (
              <div style={{background:'#27272A',borderRadius:12,padding:'40px 24px',textAlign:'center'}}>
                <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:15,color:'#F4F4F5',marginBottom:8}}>Crafting your blend...</div>
                <div style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#71717A'}}>Matching herbs to your goals</div>
              </div>
            )}
            {step==='result' && blend && room && (
              <div>
                <div style={{background:room.light,border:`1.5px solid ${room.color}33`,borderRadius:12,padding:20,marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:room.color,marginBottom:3}}>CUSTOM BLEND</div>
                      <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:20,color:'#18181B'}}>{blend.blend_name}</div>
                      <div style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#52525B',marginTop:3}}>{blend.tagline}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:20,color:'#18181B'}}>${blend.retail_price?.toFixed(2)}</div>
                      <div style={{fontSize:11,color:'#A1A1AA'}}>2oz loose leaf</div>
                    </div>
                  </div>
                  <Stars name={blend.blend_name} color={room.color}/>
                  <div style={{background:'rgba(255,255,255,0.7)',borderRadius:8,padding:'10px 12px',marginTop:10}}>
                    <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:'#A1A1AA',marginBottom:8}}>INGREDIENTS</div>
                    {blend.herbs?.map((h,i) => (
                      <div key={i} style={{display:'flex',gap:8,marginBottom:i<blend.herbs.length-1?8:0}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:room.color,flexShrink:0,marginTop:4}}/>
                        <div>
                          <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:13,fontWeight:600,color:'#18181B'}}>{h.name} <span style={{fontWeight:400,color:'#A1A1AA'}}>- {h.amount}</span></div>
                          <div style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#71717A',lineHeight:1.4,marginTop:2}}>{h.reason}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                      <div style={{background:'rgba(255,255,255,0.7)',borderRadius:8,padding:'8px 10px'}}>
                        <div style={{fontSize:10,color:'#A1A1AA',marginBottom:3}}>BREWING</div>
                        <div style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#52525B',lineHeight:1.4}}>{blend.brewing}</div>
                      </div>
                      <div style={{background:'rgba(255,255,255,0.7)',borderRadius:8,padding:'8px 10px'}}>
                        <div style={{fontSize:10,color:'#A1A1AA',marginBottom:3}}>BEST TIME</div>
                        <div style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#52525B'}}>{blend.best_time}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button onClick={()=>{setAdded(true);setTimeout(()=>setAdded(false),2000)}} style={{padding:10,borderRadius:8,border:'none',background:added?room.color:'#22C55E',color:'#fff',fontFamily:'Space Grotesk, sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>{added?'Added!':'Add to cart'}</button>
                  <button onClick={()=>{setStep('intake');setBlend(null);setSymptoms('')}} style={{padding:10,borderRadius:8,border:'1px solid #3F3F46',background:'transparent',color:'#F4F4F5',fontFamily:'Inter, sans-serif',fontSize:13,cursor:'pointer'}}>Try another</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRoom, setActiveRoom] = useState(null)
  const [activeCat, setActiveCat] = useState('All')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [showCount, setShowCount] = useState(24)
  const shopRef = useRef(null)
  const blendRef = useRef(null)

  useEffect(() => {
    fetchAllProducts().then(prods => { setProducts(prods); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const cats = new Set()
    products.forEach(p => { const c = p.tag?.split(' · ')[0]; if (c) cats.add(c) })
    return ['All', ...Array.from(cats).sort()]
  }, [products])

  const filtered = useMemo(() => {
    let r = products
    if (activeRoom) r = r.filter(p => p.room_id === activeRoom)
    if (activeCat !== 'All') r = r.filter(p => p.tag?.split(' · ')[0] === activeCat)
    if (search) { const q = search.toLowerCase(); r = r.filter(p => p.name?.toLowerCase().includes(q) || p.blurb?.toLowerCase().includes(q)) }
    return r
  }, [products, activeRoom, activeCat, search])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const currentRoom = ROOMS.find(r => r.id === activeRoom) || null

  function selectRoom(id) {
    setActiveRoom(id); setActiveCat('All'); setSearch(''); setShowCount(24)
    if (id) setTimeout(() => shopRef.current?.scrollIntoView({behavior:'smooth',block:'start'}), 80)
  }
  function addToCart(product) {
    setCart(prev => { const ex = prev.find(i => i.id === product.id); if (ex) return prev.map(i => i.id===product.id?{...i,qty:i.qty+1}:i); return [...prev,{...product,qty:1}] })
    setCartOpen(true)
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'Space Grotesk, sans-serif',fontSize:18,color:'#A1A1AA'}}>Loading Rise and Steep...</div>

  return (
    <div style={{background:'#fff',minHeight:'100vh',position:'relative'}}>

      <nav style={{background:'#fff',borderBottom:'1px solid #E4E4E7',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 24px',position:'sticky',top:0,zIndex:30,gap:16,flexWrap:'wrap'}}>
        <img src="logo.png" alt="Rise and Steep" style={{height:44,width:'auto',cursor:'pointer',background:'white',padding:'4px 8px',borderRadius:8}} onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}/>
        <input type="text" value={search} onChange={e=>{setSearch(e.target.value);setActiveRoom(null);setActiveCat('All');setShowCount(24);shopRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}}
          placeholder="Search 456+ herbs, teas, mushrooms..."
          style={{flex:1,maxWidth:320,padding:'8px 14px',borderRadius:999,border:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:13,color:'#18181B',background:'#F9FAFB'}}
        />
        <div style={{display:'flex',gap:20,fontFamily:'Inter, sans-serif',fontSize:13,color:'#52525B'}}>
          <span style={{cursor:'pointer'}} onClick={()=>shopRef.current?.scrollIntoView({behavior:'smooth'})}>Shop</span>
          <span style={{cursor:'pointer'}} onClick={()=>blendRef.current?.scrollIntoView({behavior:'smooth'})}>Create Blend</span>
          <span style={{cursor:'pointer'}}>Wholesale</span>
        </div>
        <button onClick={()=>setCartOpen(!cartOpen)} style={{display:'flex',alignItems:'center',gap:8,fontFamily:'Inter, sans-serif',fontSize:13,border:'1px solid #E4E4E7',borderRadius:999,padding:'8px 16px',background:'#fff',cursor:'pointer',color:'#18181B',flexShrink:0}}>
          Cart <span style={{background:'#18181B',color:'#fff',borderRadius:999,fontSize:11,minWidth:18,height:18,display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{cartCount}</span>
        </button>
      </nav>

      <section style={{maxWidth:1100,margin:'0 auto',padding:'56px 24px 48px',display:'flex',gap:40,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{flex:'1 1 360px',minWidth:300}}>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2.5,color:'#A1A1AA',marginBottom:18}}>HERBAL TEA FOR PERFORMANCE</div>
          <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(42px,5.5vw,68px)',color:'#18181B',lineHeight:0.95,margin:0,letterSpacing:'-2px'}}>Steep toward<br/><span style={{color:'#A1A1AA'}}>optimal.</span></h1>
          <p style={{fontFamily:'Inter, sans-serif',fontSize:15,color:'#52525B',lineHeight:1.65,marginTop:20,maxWidth:400}}>Select your goal on the wheel or search and browse 456+ herbs, teas, and botanicals.</p>
          <div style={{display:'flex',gap:8,marginTop:20,flexWrap:'wrap'}}>
            {['No seed oils','No fillers','100% herbal','Lab-sourced'].map(tag => <div key={tag} style={{fontFamily:'Inter, sans-serif',fontSize:12,color:'#71717A',border:'1px solid #E4E4E7',borderRadius:999,padding:'5px 12px'}}>{tag}</div>)}
          </div>
          <div style={{marginTop:28,display:'flex',flexWrap:'wrap',gap:8}}>
            {ROOMS.map(room => <button key={room.id} onClick={()=>selectRoom(room.id)} style={{fontFamily:'Inter, sans-serif',fontSize:12,fontWeight:500,padding:'6px 14px',borderRadius:999,cursor:'pointer',border:`1.5px solid ${activeRoom===room.id?room.color:'#E4E4E7'}`,background:activeRoom===room.id?room.light:'transparent',color:activeRoom===room.id?room.dark:'#52525B',transition:'all 0.15s'}}>{room.label}</button>)}
          </div>
        </div>
        <div style={{flex:'0 0 auto',display:'flex',flexDirection:'column',alignItems:'center'}}>
          <div style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#A1A1AA',letterSpacing:1.5,marginBottom:10,textAlign:'center'}}>SELECT YOUR GOAL</div>
          <GoalWheel active={activeRoom} onSelect={selectRoom}/>
          {activeRoom && <button onClick={()=>setActiveRoom(null)} style={{marginTop:10,background:'none',border:'none',fontFamily:'Inter, sans-serif',fontSize:12,color:'#A1A1AA',cursor:'pointer'}}>Clear selection x</button>}
        </div>
      </section>

      <div style={{borderTop:'1px solid #E4E4E7',borderBottom:'1px solid #E4E4E7',padding:'14px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',flexWrap:'wrap'}}>
          {[['456+','Herbs and Botanicals'],['6','Wellness Goals'],['100%','Certified Organic'],['0','Fillers']].map(([num,label],i) => (
            <div key={i} style={{flex:'1 1 140px',padding:'0 20px',borderRight:i<3?'1px solid #E4E4E7':'none'}}>
              <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:20,color:'#18181B'}}>{num}</div>
              <div style={{fontFamily:'Inter, sans-serif',fontSize:12,color:'#A1A1AA',marginTop:2}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {currentRoom && (
        <div style={{borderTop:`4px solid ${currentRoom.color}`,background:currentRoom.light,padding:'24px'}}>
          <div style={{maxWidth:1100,margin:'0 auto',display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:currentRoom.color}}/>
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:700,color:currentRoom.dark}}>Showing: {currentRoom.label}</div>
            <div style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#71717A'}}>{currentRoom.sub}</div>
          </div>
        </div>
      )}

      <div ref={shopRef} style={{maxWidth:1100,margin:'0 auto',padding:'36px 24px'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
          {categories.map(cat => <button key={cat} onClick={()=>{setActiveCat(cat);setSearch('');setShowCount(24)}} style={{fontFamily:'Inter, sans-serif',fontSize:12,fontWeight:500,padding:'7px 14px',borderRadius:999,cursor:'pointer',border:`1px solid ${activeCat===cat?'#18181B':'#E4E4E7'}`,background:activeCat===cat?'#18181B':'transparent',color:activeCat===cat?'#fff':'#52525B',transition:'all 0.15s'}}>{cat}</button>)}
        </div>
        <div style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#A1A1AA',marginBottom:16}}>
          {filtered.length} product{filtered.length!==1?'s':''}{search?` for "${search}"`:''} 
        </div>
        {filtered.length === 0
          ? <div style={{textAlign:'center',padding:'60px 0',fontFamily:'Inter, sans-serif',fontSize:15,color:'#A1A1AA'}}>No products found.</div>
          : <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))',gap:14}}>
                {filtered.slice(0,showCount).map(p => <ProductCard key={p.id} product={p} onAdd={addToCart}/>)}
              </div>
              {filtered.length > showCount && (
                <div style={{textAlign:'center',marginTop:28}}>
                  <button onClick={()=>setShowCount(n=>n+24)} style={{fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:600,padding:'12px 32px',borderRadius:999,border:'1px solid #18181B',background:'transparent',color:'#18181B',cursor:'pointer'}}>
                    Load more ({filtered.length-showCount} remaining)
                  </button>
                </div>
              )}
            </>
        }
      </div>

      <div ref={blendRef}><BlendSection/></div>

      <div style={{background:'#F9FAFB',borderTop:'1px solid #E4E4E7',padding:'48px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',gap:48,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{flex:'1 1 400px'}}>
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:16}}>ABOUT RISE AND STEEP</div>
            <h2 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(26px,4vw,40px)',color:'#18181B',lineHeight:1.05,margin:0,letterSpacing:'-0.5px'}}>Every blend starts with a question: what do you actually need today?</h2>
          </div>
          <p style={{flex:'1 1 300px',fontFamily:'Inter, sans-serif',fontSize:15,color:'#52525B',lineHeight:1.65,margin:0}}>We source whole herbs in bulk, blend them around measurable effect profiles, and package them without fillers or fluff. No wellness theater. Just what works.</p>
        </div>
      </div>

      <footer style={{borderTop:'1px solid #E4E4E7',padding:'24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
          <img src="logo.png" alt="Rise and Steep" style={{height:32,width:'auto'}}/>
          <div style={{fontFamily:'Inter, sans-serif',fontSize:12,color:'#A1A1AA'}}>riseandsteep.com - Herbal tea for performance</div>
        </div>
      </footer>

      {cartOpen && <>
        <div onClick={()=>setCartOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.15)',zIndex:39}}/>
        <CartDrawer cart={cart} onClose={()=>setCartOpen(false)}
          onRemove={id=>setCart(prev=>prev.filter(i=>i.id!==id))}
          onQty={(id,d)=>setCart(prev=>prev.map(i=>i.id===id?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0))}
        />
      </>}
    </div>
  )
}
