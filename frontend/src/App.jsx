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

const SIZES = [
  { label:'1oz',  oz:1 },
  { label:'2oz',  oz:2 },
  { label:'4oz',  oz:4 },
  { label:'1lb',  oz:16 },
]

const FREE_SHIPPING_THRESHOLD_CENTS = 4500 // $45, must match worker/src/routes/orders.js

const COMPANY = {
  addressLine1: '850 S Boulder Hwy, Ste 370',
  city: 'Henderson',
  state: 'NV',
  zip: '89015',
  country: 'US',
  email: 'support@riseandsteep.com',
}

const BLEND_PROMPT = `You are the Rise & Steep master herbalist. Create a custom herbal tea blend. Respond ONLY with valid JSON:
{"blend_name":"Name","tagline":"Short tagline","room":"energy|sleep|gut|immune|stress|detox","herbs":[{"name":"Herb","amount":"1 part","reason":"Why"}],"brewing":"Instructions","best_time":"Time","retail_price":24.00,"notes":"Note"}
Use 3-6 herbs, parts system, price $18-38. Do not use the words "organic" or "certified organic" anywhere in your response, even in passing — describe quality using other language (e.g. "high-quality," "carefully sourced").`

function getPageFromHash() {
  const h = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '')
  if (h === 'about' || h === 'contact' || h === 'success' || h === 'admin' || h === 'privacy' || h === 'terms' || h === 'shipping' || h === 'faq') return h
  return 'home'
}

function priceForSize(product, oz) {
  const baseWeight = product.weight_oz || 2
  return Math.round((product.price_cents / baseWeight) * oz)
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

function ProductImage({ product, room, height }) {
  const [imgError, setImgError] = useState(false)
  const initials = product.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()
  const cat = product.tag ? product.tag.split(' · ')[0] : ''
  const hasImage = !!product.image_key && !imgError
  return (
    <div style={{height,background:`linear-gradient(135deg, ${room.color}18, ${room.color}35)`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,flexShrink:0,position:'relative',overflow:'hidden'}}>
      {hasImage ? (
        <img src={product.image_key} alt={product.name} onError={() => setImgError(true)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      ) : (
        <>
          <div style={{width:56,height:56,borderRadius:'50%',background:room.color+'22',border:`2px solid ${room.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:18,color:room.color}}>{initials}</div>
          <div style={{fontFamily:'Inter, sans-serif',fontSize:10,color:room.color,letterSpacing:1,fontWeight:600,textTransform:'uppercase'}}>{cat || 'Herb'}</div>
        </>
      )}
    </div>
  )
}

function ProductCard({ product, onAdd, onOpen }) {
  const [added, setAdded] = useState(false)
  const room = ROOMS.find(r => r.id === product.room_id) || ROOMS[0]
  const price = (product.price_cents / 100).toFixed(2)
  const cat = product.tag ? product.tag.split(' · ')[0] : ''
  function handleAdd(e) {
    e.stopPropagation()
    onAdd(product, 2, product.price_cents, '2oz')
    setAdded(true); setTimeout(() => setAdded(false), 1800)
  }
  return (
    <div onClick={() => onOpen(product)} style={{background:'#fff',border:`1px solid ${room.color}22`,borderRadius:12,overflow:'hidden',display:'flex',flexDirection:'column',cursor:'pointer'}}>
      <ProductImage product={product} room={room} height={140}/>
      <div style={{padding:14,display:'flex',flexDirection:'column',gap:8,flex:1}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div style={{flex:1,paddingRight:8}}>
            {cat && <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:room.color,marginBottom:3}}>{cat.toUpperCase()}</div>}
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:15,color:'#18181B',lineHeight:1.2}}>{product.name}</div>
          </div>
          <EffectBars product={product} color={room.accent}/>
        </div>
        <p style={{fontFamily:'Inter, sans-serif',fontSize:12,color:'#52525B',lineHeight:1.5,margin:0}}>{product.blurb}</p>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'auto',paddingTop:4}}>
          <span style={{fontFamily:'Space Grotesk, sans-serif',fontSize:15,fontWeight:700,color:'#18181B'}}>${price}</span>
          <button onClick={handleAdd} style={{fontFamily:'Inter, sans-serif',fontSize:12,fontWeight:500,padding:'7px 14px',borderRadius:999,border:'none',background:added?room.color:room.accent,color:'#fff',cursor:'pointer',transition:'background 0.2s'}}>{added?'Added!':'Add to cart'}</button>
        </div>
      </div>
    </div>
  )
}

function ProductModal({ product, onClose, onAdd, cartTotalCents }) {
  const [selectedOz, setSelectedOz] = useState(2)
  const [added, setAdded] = useState(false)
  const room = ROOMS.find(r => r.id === product.room_id) || ROOMS[0]
  const cat = product.tag ? product.tag.split(' · ')[0] : ''
  const priceCents = priceForSize(product, selectedOz)
  const sizeLabel = SIZES.find(s => s.oz === selectedOz)?.label || `${selectedOz}oz`
  const projectedTotal = cartTotalCents + priceCents
  const remainingCents = FREE_SHIPPING_THRESHOLD_CENTS - projectedTotal

  function handleAdd() {
    onAdd(product, selectedOz, priceCents, sizeLabel)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,overflow:'hidden',maxWidth:460,width:'100%',maxHeight:'88vh',overflowY:'auto',position:'relative'}}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:12,width:32,height:32,borderRadius:'50%',border:'none',background:'rgba(255,255,255,0.9)',fontSize:18,color:'#18181B',cursor:'pointer',zIndex:2,display:'flex',alignItems:'center',justifyContent:'center'}}>x</button>
        <ProductImage product={product} room={room} height={220}/>
        <div style={{padding:24,display:'flex',flexDirection:'column',gap:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
            <div>
              {cat && <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:room.color,marginBottom:4}}>{cat.toUpperCase()}</div>}
              <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:22,color:'#18181B',lineHeight:1.15}}>{product.name}</div>
            </div>
            <EffectBars product={product} color={room.accent}/>
          </div>
          <p style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#52525B',lineHeight:1.6,margin:0}}>{product.description || product.blurb}</p>

          <div>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:'#A1A1AA',marginBottom:8}}>SELECT SIZE</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:8}}>
              {SIZES.map(s => {
                const isSel = s.oz === selectedOz
                const sPrice = (priceForSize(product, s.oz) / 100).toFixed(2)
                return (
                  <button key={s.label} onClick={()=>setSelectedOz(s.oz)} style={{padding:'10px 6px',borderRadius:8,border:`1.5px solid ${isSel?room.color:'#E4E4E7'}`,background:isSel?room.light:'#fff',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                    <span style={{fontFamily:'Space Grotesk, sans-serif',fontSize:13,fontWeight:700,color:isSel?room.dark:'#18181B'}}>{s.label}</span>
                    <span style={{fontFamily:'Inter, sans-serif',fontSize:11,color:isSel?room.dark:'#71717A'}}>${sPrice}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{background:remainingCents<=0?'#F0FDF4':'#F9FAFB',border:`1px solid ${remainingCents<=0?'#BBF7D0':'#E4E4E7'}`,borderRadius:8,padding:'10px 12px',fontFamily:'Inter, sans-serif',fontSize:12,color:remainingCents<=0?'#15803D':'#52525B',textAlign:'center'}}>
            {remainingCents <= 0
              ? '🎉 This order qualifies for free US shipping!'
              : `Add $${(remainingCents/100).toFixed(2)} more to unlock free US shipping`}
          </div>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:6}}>
            <span style={{fontFamily:'Space Grotesk, sans-serif',fontSize:22,fontWeight:700,color:'#18181B'}}>${(priceCents/100).toFixed(2)}</span>
            <button onClick={handleAdd} style={{fontFamily:'Inter, sans-serif',fontSize:14,fontWeight:600,padding:'12px 28px',borderRadius:999,border:'none',background:added?room.color:room.accent,color:'#fff',cursor:'pointer',transition:'background 0.2s'}}>{added?'Added!':'Add to cart'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmailPopup({ onClose }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')

  function dismiss() {
    localStorage.setItem('rs_email_popup_seen', 'dismissed')
    onClose()
  }

  async function submit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const r = await fetch(`${API}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'popup' }),
      })
      if (r.ok) {
        setStatus('done')
        localStorage.setItem('rs_email_popup_seen', 'subscribed')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div onClick={dismiss} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,maxWidth:420,width:'100%',padding:'36px 32px',position:'relative',textAlign:'center'}}>
        <button onClick={dismiss} style={{position:'absolute',top:14,right:14,background:'none',border:'none',fontSize:18,color:'#A1A1AA',cursor:'pointer'}}>x</button>
        {status !== 'done' ? (
          <>
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:22,fontWeight:700,color:'#18181B',marginBottom:8}}>Stay in the loop</div>
            <p style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#52525B',lineHeight:1.6,marginBottom:22}}>Get first access to new blends, restocks, and the occasional herbalist tip. No spam, unsubscribe anytime.</p>
            <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:10}}>
              <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"
                style={{padding:'12px 14px',borderRadius:8,border:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:14,boxSizing:'border-box'}}/>
              <button type="submit" disabled={status==='loading'} style={{padding:12,borderRadius:8,border:'none',background:'#18181B',color:'#fff',fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:600,cursor:'pointer'}}>{status==='loading'?'Joining...':'Join the list'}</button>
            </form>
            {status==='error' && <div style={{color:'#DC2626',fontSize:12,marginTop:10,fontFamily:'Inter, sans-serif'}}>Something went wrong — please try again.</div>}
          </>
        ) : (
          <>
            <div style={{fontSize:36,marginBottom:10}}>✓</div>
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:20,fontWeight:700,color:'#18181B',marginBottom:8}}>You're on the list!</div>
            <p style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#52525B'}}>We'll be in touch with new blends and restocks.</p>
          </>
        )}
      </div>
    </div>
  )
}

function CartDrawer({ cart, onClose, onRemove, onQty, onCheckout, checkingOut }) {
  const total = cart.reduce((s, i) => s + (i.price_cents / 100) * i.qty, 0)
  return (
    <div style={{position:'absolute',top:0,right:0,width:340,background:'#fff',borderLeft:'1px solid #E4E4E7',minHeight:'100%',padding:24,zIndex:40,boxSizing:'border-box'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:18,color:'#18181B'}}>Your cart</div>
        <button onClick={onClose} style={{background:'none',border:'none',fontSize:20,color:'#A1A1AA',cursor:'pointer'}}>x</button>
      </div>
      {cart.length === 0 ? <p style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#A1A1AA'}}>Nothing added yet.</p> : <>
        {(() => {
          const totalCents = cart.reduce((s,i)=>s+i.price_cents*i.qty,0)
          const remaining = FREE_SHIPPING_THRESHOLD_CENTS - totalCents
          const pct = Math.min(100, (totalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100)
          return (
            <div style={{marginBottom:18}}>
              <div style={{fontFamily:'Inter, sans-serif',fontSize:12,color:remaining<=0?'#16A34A':'#52525B',marginBottom:6}}>
                {remaining <= 0 ? '🎉 You unlocked free US shipping!' : `Add $${(remaining/100).toFixed(2)} more for free US shipping`}
              </div>
              <div style={{height:6,borderRadius:999,background:'#F4F4F5',overflow:'hidden'}}>
                <div style={{height:'100%',width:`${pct}%`,background:'#16A34A',borderRadius:999,transition:'width 0.3s'}}/>
              </div>
            </div>
          )
        })()}
        {cart.map(item => (
          <div key={item.cartId} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #F4F4F5',paddingBottom:14,marginBottom:14}}>
            <div>
              <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:600,fontSize:13,color:'#18181B'}}>{item.name} <span style={{fontWeight:400,color:'#A1A1AA'}}>({item.size})</span></div>
              <div style={{fontFamily:'Inter, sans-serif',fontSize:11,color:'#A1A1AA',marginTop:3}}>${(item.price_cents/100).toFixed(2)} each</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                <button onClick={()=>onQty(item.cartId,-1)} style={{width:22,height:22,borderRadius:6,border:'1px solid #E4E4E7',background:'transparent',cursor:'pointer',fontSize:12}}>-</button>
                <span style={{fontFamily:'Inter, sans-serif',fontSize:13}}>{item.qty}</span>
                <button onClick={()=>onQty(item.cartId,1)} style={{width:22,height:22,borderRadius:6,border:'1px solid #E4E4E7',background:'transparent',cursor:'pointer',fontSize:12}}>+</button>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',justifyContent:'space-between'}}>
              <span style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:14}}>${((item.price_cents/100)*item.qty).toFixed(2)}</span>
              <button onClick={()=>onRemove(item.cartId)} style={{background:'none',border:'none',fontSize:11,color:'#A1A1AA',cursor:'pointer'}}>Remove</button>
            </div>
          </div>
        ))}
        <div style={{borderTop:'1px solid #E4E4E7',paddingTop:14}}>
          <div style={{display:'flex',justifyContent:'space-between',fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:16,color:'#18181B',marginBottom:12}}>
            <span>Subtotal</span><span>${total.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout} disabled={checkingOut} style={{width:'100%',padding:13,borderRadius:999,border:'none',background:checkingOut?'#71717A':'#18181B',color:'#fff',fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:600,cursor:checkingOut?'default':'pointer'}}>{checkingOut?'Redirecting...':'Checkout'}</button>
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
      const resp = await fetch(`${API}/api/blend`, {
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

function AboutPage() {
  return (
    <div style={{maxWidth:820,margin:'0 auto',padding:'56px 24px 80px'}}>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:14}}>ABOUT RISE & STEEP</div>
      <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(30px,4vw,44px)',color:'#18181B',lineHeight:1.1,margin:'0 0 24px',letterSpacing:'-0.5px'}}>Herbal tea, built like a training plan.</h1>

      <div style={{display:'flex',flexDirection:'column',gap:20,fontFamily:'Inter, sans-serif',fontSize:15,color:'#3F3F46',lineHeight:1.75}}>
        <p>Rise & Steep started with a simple frustration: most herbal tea is sold on vibes. Pretty packaging, vague promises, and not much else. We wanted something closer to how you'd approach training or nutrition — pick a goal, use the ingredients that actually support it, and skip the fluff.</p>
        <p>So that's what we built. Every blend on this site is organized around a specific outcome — energy, sleep, gut health, immunity, stress, or detox — and made from whole herbs sourced for quality, not just a nice label. No seed oils. No filler ingredients. Nothing added just to bulk out a bag.</p>
        <p>We also carry hundreds of individual herbs, teas, and mushrooms on their own, for people who already know what they're looking for and just want the real thing — quality-sourced and priced by the ounce so you can buy exactly as much as you need.</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',gap:16,marginTop:40}}>
        {['No seed oils','No fillers','100% herbal','Lab-sourced'].map(tag => (
          <div key={tag} style={{border:'1px solid #E4E4E7',borderRadius:12,padding:'16px',fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:600,color:'#18181B',textAlign:'center'}}>{tag}</div>
        ))}
      </div>

      <div style={{marginTop:48,padding:24,background:'#F9FAFB',borderRadius:12,border:'1px solid #E4E4E7'}}>
        <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:16,color:'#18181B',marginBottom:8}}>Questions before you order?</div>
        <p style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#52525B',margin:0,lineHeight:1.6}}>Reach out any time — we'd rather answer a question up front than have you guess. See our <a href="#contact" style={{color:'#16A34A',fontWeight:600}}>Contact page</a> for details.</p>
      </div>
    </div>
  )
}

function ContactPage() {
  return (
    <div style={{maxWidth:820,margin:'0 auto',padding:'56px 24px 80px'}}>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:14}}>CONTACT</div>
      <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(30px,4vw,44px)',color:'#18181B',lineHeight:1.1,margin:'0 0 16px',letterSpacing:'-0.5px'}}>Get in touch.</h1>
      <p style={{fontFamily:'Inter, sans-serif',fontSize:15,color:'#52525B',lineHeight:1.7,margin:'0 0 40px',maxWidth:520}}>Questions about an order, a blend, wholesale pricing, or anything else — we usually respond within 1-2 business days.</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:20}}>
        <div style={{border:'1px solid #E4E4E7',borderRadius:12,padding:24}}>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:13,letterSpacing:1,color:'#A1A1AA',marginBottom:10}}>EMAIL</div>
          <a href={`mailto:${COMPANY.email}`} style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:18,color:'#16A34A',textDecoration:'none'}}>{COMPANY.email}</a>
        </div>
        <div style={{border:'1px solid #E4E4E7',borderRadius:12,padding:24}}>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:13,letterSpacing:1,color:'#A1A1AA',marginBottom:10}}>MAILING ADDRESS</div>
          <div style={{fontFamily:'Inter, sans-serif',fontSize:15,color:'#18181B',lineHeight:1.6}}>
            {COMPANY.addressLine1}<br/>
            {COMPANY.city}, {COMPANY.state} {COMPANY.zip}<br/>
            {COMPANY.country}
          </div>
        </div>
      </div>

      <div style={{marginTop:32,fontFamily:'Inter, sans-serif',fontSize:13,color:'#A1A1AA'}}>
        Looking for bulk or wholesale pricing? Mention it in your email and we'll follow up with details.
      </div>
    </div>
  )
}

function PrivacyPage() {
  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'56px 24px 80px'}}>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:14}}>LEGAL</div>
      <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(28px,4vw,38px)',color:'#18181B',lineHeight:1.1,margin:'0 0 24px'}}>Privacy Policy</h1>
      <div style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#3F3F46',lineHeight:1.75,display:'flex',flexDirection:'column',gap:16}}>
        <p>Last updated: July 2026</p>
        <p>Rise & Steep ("we," "us," or "our") respects your privacy. This policy explains what information we collect, how we use it, and the choices you have.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Information we collect</h3>
        <p>When you place an order, we collect your name, email address, shipping address, and payment information. Payment is processed securely by Stripe — we never see or store your full card number. If you sign up for our email list, we collect only your email address.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>How we use it</h3>
        <p>We use your information to process and ship your order, send order confirmations, respond to support requests, and — if you've opted in — send occasional emails about new products and restocks. We do not sell your personal information to third parties.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Third parties</h3>
        <p>We share order information with Stripe (payment processing) and our shipping carrier (to deliver your package) only as needed to fulfill your order. These providers are bound by their own privacy and security obligations.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Your choices</h3>
        <p>You can unsubscribe from marketing emails at any time using the link in any email, or by contacting us directly. To request deletion of your personal data, email us and we'll process your request promptly.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Contact</h3>
        <p>Questions about this policy? Email <a href={`mailto:${COMPANY.email}`} style={{color:'#16A34A'}}>{COMPANY.email}</a> or write to us at {COMPANY.addressLine1}, {COMPANY.city}, {COMPANY.state} {COMPANY.zip}.</p>
      </div>
    </div>
  )
}

function TermsPage() {
  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'56px 24px 80px'}}>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:14}}>LEGAL</div>
      <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(28px,4vw,38px)',color:'#18181B',lineHeight:1.1,margin:'0 0 24px'}}>Terms of Service</h1>
      <div style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#3F3F46',lineHeight:1.75,display:'flex',flexDirection:'column',gap:16}}>
        <p>Last updated: July 2026</p>
        <p>By using riseandsteep.com or placing an order with us, you agree to the following terms.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Orders and payment</h3>
        <p>All orders are subject to product availability. Prices are listed in USD and may change without notice. Payment is processed securely at checkout via Stripe; your order is confirmed once payment is successfully completed.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Product information</h3>
        <p>Our herbs, teas, and blends are sold as food and botanical products, not as drugs or supplements intended to diagnose, treat, cure, or prevent any disease. Statements on this site have not been evaluated by the FDA. Consult a healthcare provider before use if you are pregnant, nursing, taking medication, or have a medical condition.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Shipping and returns</h3>
        <p>See our <a href="#shipping" style={{color:'#16A34A'}}>Shipping & Returns</a> page for details on delivery times and our return policy.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Limitation of liability</h3>
        <p>Rise & Steep is not liable for any indirect, incidental, or consequential damages arising from the use of our products or website. Our total liability for any claim is limited to the amount you paid for the product in question.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Changes to these terms</h3>
        <p>We may update these terms from time to time. Continued use of the site after changes constitutes acceptance of the updated terms.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Contact</h3>
        <p>Questions? Email <a href={`mailto:${COMPANY.email}`} style={{color:'#16A34A'}}>{COMPANY.email}</a>.</p>
      </div>
    </div>
  )
}

function ShippingPage() {
  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'56px 24px 80px'}}>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:14}}>SHIPPING & RETURNS</div>
      <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(28px,4vw,38px)',color:'#18181B',lineHeight:1.1,margin:'0 0 24px'}}>Shipping & Returns</h1>
      <div style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#3F3F46',lineHeight:1.75,display:'flex',flexDirection:'column',gap:16}}>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B'}}>Processing time</h3>
        <p>Orders are typically packed and shipped within 1-3 business days. You'll receive an email with tracking information as soon as your order ships.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Shipping rates & delivery</h3>
        <p>We ship via USPS and UPS within the United States. Exact shipping cost is calculated at checkout based on your order weight and destination. Most orders arrive within 3-7 business days of shipping.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Returns</h3>
        <p>Because our products are food items, we're unable to accept returns of opened products for hygiene and safety reasons. If your order arrives damaged, incorrect, or defective, contact us within 14 days of delivery at <a href={`mailto:${COMPANY.email}`} style={{color:'#16A34A'}}>{COMPANY.email}</a> and we'll make it right with a replacement or refund.</p>

        <h3 style={{fontFamily:'Space Grotesk, sans-serif',fontSize:16,color:'#18181B',marginTop:8}}>Questions</h3>
        <p>Reach out any time at <a href={`mailto:${COMPANY.email}`} style={{color:'#16A34A'}}>{COMPANY.email}</a> — we're happy to help.</p>
      </div>
    </div>
  )
}

const FAQ_ITEMS = [
  { q: "How fresh are your herbs?", a: "We source in small batches and rotate stock regularly so you're never getting something that's been sitting in a warehouse for years. If a batch runs low, we replace it rather than let it age out." },
  { q: "How should I store my herbs and tea?", a: "Keep them in a cool, dry place away from direct sunlight, ideally in an airtight container. Properly stored, most herbs stay at their best for 6-12 months." },
  { q: "Are your products tested for quality?", a: "Yes — our herbs are lab-sourced and screened for identity and contaminants before they reach you." },
  { q: "Can I take these herbs if I'm pregnant, nursing, or on medication?", a: "Please consult a qualified healthcare provider before using any herbal product if you're pregnant, nursing, or taking medication. Some herbs can interact with medications or aren't recommended during pregnancy." },
  { q: "How does the AI Blend Builder work?", a: "Describe what you're dealing with — low energy, trouble sleeping, stress, etc. — and our AI herbalist suggests a custom blend of herbs, ratios, and brewing instructions tailored to your goal." },
  { q: "What sizes do you offer?", a: "Most products are available in 1oz, 2oz, 4oz, or 1lb, priced per ounce so you only buy as much as you need." },
  { q: "Do you ship internationally?", a: "Right now we ship to the United States and Canada only. See our Shipping & Returns page for rates and delivery estimates." },
  { q: "What's your return policy?", a: "Since our products are food items, we can't accept returns of opened products for hygiene reasons. If your order arrives damaged, incorrect, or defective, contact us within 14 days and we'll make it right." },
  { q: "Do you offer wholesale pricing?", a: "Yes — email us at support@riseandsteep.com with your business details and what you're interested in, and we'll follow up with wholesale pricing." },
  { q: "How do I contact support?", a: "Email support@riseandsteep.com any time — we typically respond within 1-2 business days." },
]

function AccordionItem({ q, a, isOpen, onToggle }) {
  return (
    <div style={{borderBottom:'1px solid #E4E4E7'}}>
      <button onClick={onToggle} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 0',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
        <span style={{fontFamily:'Space Grotesk, sans-serif',fontSize:15,fontWeight:600,color:'#18181B'}}>{q}</span>
        <span style={{fontFamily:'Inter, sans-serif',fontSize:18,color:'#A1A1AA',transform:isOpen?'rotate(45deg)':'none',transition:'transform 0.2s',flexShrink:0,marginLeft:12}}>+</span>
      </button>
      {isOpen && <p style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#52525B',lineHeight:1.65,margin:'0 0 18px',paddingRight:28}}>{a}</p>}
    </div>
  )
}

function FAQPage() {
  const [openIndex, setOpenIndex] = useState(0)
  return (
    <div style={{maxWidth:760,margin:'0 auto',padding:'56px 24px 80px'}}>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:14}}>FAQ</div>
      <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(28px,4vw,38px)',color:'#18181B',lineHeight:1.1,margin:'0 0 32px'}}>Frequently asked questions.</h1>
      <div>
        {FAQ_ITEMS.map((item, i) => (
          <AccordionItem key={i} q={item.q} a={item.a} isOpen={openIndex===i} onToggle={()=>setOpenIndex(openIndex===i?-1:i)}/>
        ))}
      </div>
      <div style={{marginTop:32,fontFamily:'Inter, sans-serif',fontSize:13,color:'#A1A1AA'}}>
        Still have a question? <a href="#contact" style={{color:'#16A34A',fontWeight:600}}>Contact us</a>.
      </div>
    </div>
  )
}

function HomeFAQSection() {
  const [openIndex, setOpenIndex] = useState(0)
  const preview = FAQ_ITEMS.slice(0, 5)
  return (
    <div style={{maxWidth:1100,margin:'0 auto',padding:'48px 24px'}}>
      <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2,color:'#A1A1AA',marginBottom:12}}>FAQ</div>
      <h2 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(24px,4vw,32px)',color:'#18181B',margin:'0 0 20px'}}>Common questions</h2>
      <div style={{maxWidth:700}}>
        {preview.map((item, i) => (
          <AccordionItem key={i} q={item.q} a={item.a} isOpen={openIndex===i} onToggle={()=>setOpenIndex(openIndex===i?-1:i)}/>
        ))}
      </div>
      <a href="#faq" style={{display:'inline-block',marginTop:20,fontFamily:'Inter, sans-serif',fontSize:13,color:'#16A34A',fontWeight:600}}>See all FAQs →</a>
    </div>
  )
}

function SuccessPage({ onOrderConfirmed }) {
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (!sessionId) { setStatus('error'); return }

    let attempts = 0
    async function poll() {
      attempts++
      try {
        const r = await fetch(`${API}/api/orders/by-session/${sessionId}`)
        if (r.ok) {
          const data = await r.json()
          setOrder(data)
          setStatus('ok')
          onOrderConfirmed()
          return
        }
      } catch {}
      if (attempts < 8) setTimeout(poll, 1500)
      else setStatus('error')
    }
    poll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  let items = []
  try { items = order ? JSON.parse(order.items_json) : [] } catch {}

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'72px 24px 80px',textAlign:'center'}}>
      {status === 'loading' && (
        <>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:20,fontWeight:700,color:'#18181B',marginBottom:10}}>Confirming your order...</div>
          <div style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#71717A'}}>This usually only takes a few seconds.</div>
        </>
      )}
      {status === 'error' && (
        <>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:20,fontWeight:700,color:'#18181B',marginBottom:10}}>We couldn't confirm that order automatically.</div>
          <p style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#71717A',lineHeight:1.6}}>If you completed payment, don't worry — it likely still went through. Contact us at <a href={`mailto:${COMPANY.email}`} style={{color:'#16A34A'}}>{COMPANY.email}</a> and we'll confirm it for you.</p>
        </>
      )}
      {status === 'ok' && order && (
        <>
          <div style={{fontSize:40,marginBottom:12}}>✓</div>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:24,fontWeight:700,color:'#18181B',marginBottom:8}}>Thanks for your order!</div>
          <p style={{fontFamily:'Inter, sans-serif',fontSize:14,color:'#71717A',marginBottom:28}}>Order <b>{order.id}</b> — a confirmation has been sent to your email.</p>
          <div style={{border:'1px solid #E4E4E7',borderRadius:12,padding:20,textAlign:'left'}}>
            {items.map((it, i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',fontFamily:'Inter, sans-serif',fontSize:13,color:'#18181B',padding:'6px 0'}}>
                <span>Qty {it.qty} × {it.oz ? (it.oz >= 16 ? `${it.oz/16}lb` : `${it.oz}oz`) : ''}</span>
              </div>
            ))}
            <div style={{borderTop:'1px solid #E4E4E7',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:15,color:'#18181B'}}>
              <span>Total</span><span>${(order.total_cents/100).toFixed(2)}</span>
            </div>
          </div>
          <a href="#" style={{display:'inline-block',marginTop:28,fontFamily:'Inter, sans-serif',fontSize:13,color:'#16A34A',fontWeight:600}}>← Back to shop</a>
        </>
      )}
    </div>
  )
}

const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'cancelled']

function OrderRow({ order, productMap }) {
  const [status, setStatus] = useState(order.status)
  const [notes, setNotes] = useState(order.notes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  let items = []
  try { items = JSON.parse(order.items_json || '[]') } catch {}

  let shipping = null
  try { shipping = order.shipping_json ? JSON.parse(order.shipping_json) : null } catch {}

  async function save() {
    setSaving(true)
    const secret = sessionStorage.getItem('rs_admin_secret')
    try {
      await fetch(`${API}/api/admin/orders/${order.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
        body: JSON.stringify({ status, notes }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {}
    setSaving(false)
  }

  const statusColors = { pending:'#D97706', paid:'#2563EB', shipped:'#16A34A', cancelled:'#DC2626' }

  return (
    <div style={{border:'1px solid #E4E4E7',borderRadius:12,padding:20,marginBottom:14}}>
      <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12}}>
        <div>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:15,color:'#18181B'}}>{order.id}</div>
          <div style={{fontFamily:'Inter, sans-serif',fontSize:12,color:'#A1A1AA'}}>{order.created_at}</div>
        </div>
        <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:1,color:'#fff',background:statusColors[order.status]||'#71717A',padding:'4px 10px',borderRadius:999,height:'fit-content'}}>{order.status.toUpperCase()}</div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:14,fontFamily:'Inter, sans-serif',fontSize:13}}>
        <div>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:'#A1A1AA',marginBottom:4}}>CUSTOMER</div>
          <div style={{color:'#18181B'}}>{order.name || '(no name)'}</div>
          <div style={{color:'#52525B'}}>{order.email || '(no email)'}</div>
        </div>
        <div>
          <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:'#A1A1AA',marginBottom:4}}>SHIP TO</div>
          {shipping ? (
            <div style={{color:'#18181B',lineHeight:1.5}}>
              {shipping.line1}{shipping.line2 ? `, ${shipping.line2}` : ''}<br/>
              {shipping.city}, {shipping.state} {shipping.postal_code}<br/>
              {shipping.country}
            </div>
          ) : <div style={{color:'#A1A1AA'}}>No address on file</div>}
        </div>
      </div>

      <div style={{background:'#F9FAFB',borderRadius:8,padding:12,marginBottom:14,fontFamily:'Inter, sans-serif',fontSize:13}}>
        <div style={{fontSize:10,fontWeight:600,letterSpacing:1,color:'#A1A1AA',marginBottom:6}}>ITEMS</div>
        {items.map((it, i) => (
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
            <span>{productMap[it.product_id] || it.product_id} — {it.oz >= 16 ? `${it.oz/16}lb` : `${it.oz || 2}oz`} × {it.qty}</span>
          </div>
        ))}
        <div style={{borderTop:'1px solid #E4E4E7',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between',fontWeight:700}}>
          <span>Total</span><span>${(order.total_cents/100).toFixed(2)}</span>
        </div>
      </div>

      <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'8px 10px',borderRadius:8,border:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:13}}>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Tracking number / notes"
          style={{flex:1,minWidth:180,padding:'8px 10px',borderRadius:8,border:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:13}}/>
        <button onClick={save} disabled={saving} style={{padding:'8px 18px',borderRadius:8,border:'none',background:saved?'#16A34A':'#18181B',color:'#fff',fontFamily:'Inter, sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>{saving?'Saving...':saved?'Saved!':'Save'}</button>
      </div>
    </div>
  )
}

function SubscribersList({ secret }) {
  const [subs, setSubs] = useState(null)

  useEffect(() => {
    fetch(`${API}/api/admin/subscribers`, { headers: { Authorization: `Bearer ${secret}` } })
      .then(r => r.json())
      .then(d => setSubs(d.subscribers || []))
      .catch(() => setSubs([]))
  }, [secret])

  if (!subs) return <div style={{fontFamily:'Inter, sans-serif',color:'#A1A1AA'}}>Loading subscribers...</div>
  if (subs.length === 0) return <div style={{fontFamily:'Inter, sans-serif',color:'#A1A1AA'}}>No subscribers yet.</div>

  return (
    <div style={{border:'1px solid #E4E4E7',borderRadius:12,overflow:'hidden'}}>
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',padding:'10px 16px',background:'#F9FAFB',borderBottom:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:11,fontWeight:600,letterSpacing:1,color:'#A1A1AA'}}>
        <div>EMAIL</div><div>SOURCE</div><div>JOINED</div>
      </div>
      {subs.map(s => (
        <div key={s.id} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',padding:'10px 16px',borderBottom:'1px solid #F4F4F5',fontFamily:'Inter, sans-serif',fontSize:13,color:'#18181B'}}>
          <div>{s.email}</div><div style={{color:'#71717A'}}>{s.source}</div><div style={{color:'#71717A'}}>{s.created_at}</div>
        </div>
      ))}
    </div>
  )
}

function AdminPage() {
  const [secret, setSecret] = useState(sessionStorage.getItem('rs_admin_secret') || '')
  const [input, setInput] = useState('')
  const [orders, setOrders] = useState(null)
  const [productMap, setProductMap] = useState({})
  const [authError, setAuthError] = useState(false)
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState('orders')

  async function loadOrders(s) {
    setAuthError(false)
    try {
      const r = await fetch(`${API}/api/admin/orders`, { headers: { Authorization: `Bearer ${s}` } })
      if (r.status === 401) { setAuthError(true); sessionStorage.removeItem('rs_admin_secret'); setSecret(''); return }
      const data = await r.json()
      setOrders(data.orders || [])
    } catch {}
  }

  useEffect(() => {
    if (secret) loadOrders(secret)
    fetchAllProducts().then(prods => {
      const map = {}
      prods.forEach(p => { map[p.id] = p.name })
      setProductMap(map)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret])

  function handleLogin(e) {
    e.preventDefault()
    sessionStorage.setItem('rs_admin_secret', input)
    setSecret(input)
  }

  if (!secret) {
    return (
      <div style={{maxWidth:360,margin:'0 auto',padding:'100px 24px'}}>
        <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:20,color:'#18181B',marginBottom:16}}>Admin login</div>
        <form onSubmit={handleLogin}>
          <input type="password" value={input} onChange={e=>setInput(e.target.value)} placeholder="Admin secret"
            style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:14,boxSizing:'border-box',marginBottom:12}}/>
          <button type="submit" style={{width:'100%',padding:12,borderRadius:8,border:'none',background:'#18181B',color:'#fff',fontFamily:'Space Grotesk, sans-serif',fontSize:14,fontWeight:600,cursor:'pointer'}}>Log in</button>
        </form>
        {authError && <div style={{color:'#DC2626',fontFamily:'Inter, sans-serif',fontSize:13,marginTop:10}}>Incorrect secret.</div>}
      </div>
    )
  }

  const filtered = orders ? (filter === 'all' ? orders : orders.filter(o => o.status === filter)) : null

  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:'40px 24px 80px'}}>
      <div style={{display:'flex',gap:8,marginBottom:24}}>
        <button onClick={()=>setTab('orders')} style={{padding:'8px 18px',borderRadius:999,border:`1px solid ${tab==='orders'?'#18181B':'#E4E4E7'}`,background:tab==='orders'?'#18181B':'transparent',color:tab==='orders'?'#fff':'#52525B',fontFamily:'Space Grotesk, sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>Orders</button>
        <button onClick={()=>setTab('subscribers')} style={{padding:'8px 18px',borderRadius:999,border:`1px solid ${tab==='subscribers'?'#18181B':'#E4E4E7'}`,background:tab==='subscribers'?'#18181B':'transparent',color:tab==='subscribers'?'#fff':'#52525B',fontFamily:'Space Grotesk, sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>Subscribers</button>
      </div>

      {tab === 'orders' && <>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:10}}>
          <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:22,color:'#18181B'}}>Orders</div>
          <div style={{display:'flex',gap:8}}>
            {['all', ...ORDER_STATUSES].map(s => (
              <button key={s} onClick={()=>setFilter(s)} style={{padding:'6px 14px',borderRadius:999,border:`1px solid ${filter===s?'#18181B':'#E4E4E7'}`,background:filter===s?'#18181B':'transparent',color:filter===s?'#fff':'#52525B',fontFamily:'Inter, sans-serif',fontSize:12,cursor:'pointer'}}>{s}</button>
            ))}
          </div>
        </div>
        {!orders && <div style={{fontFamily:'Inter, sans-serif',color:'#A1A1AA'}}>Loading orders...</div>}
        {filtered && filtered.length === 0 && <div style={{fontFamily:'Inter, sans-serif',color:'#A1A1AA'}}>No orders found.</div>}
        {filtered && filtered.map(o => <OrderRow key={o.id} order={o} productMap={productMap}/>)}
      </>}

      {tab === 'subscribers' && <>
        <div style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:22,color:'#18181B',marginBottom:24}}>Subscribers</div>
        <SubscribersList secret={secret}/>
      </>}
    </div>
  )
}

function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading, open])

  async function send(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await r.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Sorry, something went wrong. Try emailing support@riseandsteep.com." }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Try emailing support@riseandsteep.com." }])
    }
    setLoading(false)
  }

  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{position:'fixed',bottom:20,right:20,width:56,height:56,borderRadius:'50%',border:'none',background:'#18181B',color:'#fff',fontSize:24,cursor:'pointer',zIndex:80,boxShadow:'0 4px 16px rgba(0,0,0,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        {open ? '×' : '💬'}
      </button>

      {open && (
        <div style={{position:'fixed',bottom:86,right:20,width:340,maxWidth:'calc(100vw - 40px)',height:460,maxHeight:'calc(100vh - 120px)',background:'#fff',borderRadius:16,boxShadow:'0 8px 32px rgba(0,0,0,0.25)',zIndex:80,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{background:'#18181B',color:'#fff',padding:'14px 16px',fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:14}}>
            Rise & Steep Support
          </div>
          <div ref={scrollRef} style={{flex:1,overflowY:'auto',padding:14,display:'flex',flexDirection:'column',gap:10}}>
            {messages.length === 0 && (
              <div style={{fontFamily:'Inter, sans-serif',fontSize:13,color:'#71717A',lineHeight:1.5}}>
                Hi! Ask me about shipping, herbs, or check the status of an order (you'll need your order ID and the email used at checkout).
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{alignSelf:m.role==='user'?'flex-end':'flex-start',maxWidth:'85%',background:m.role==='user'?'#18181B':'#F4F4F5',color:m.role==='user'?'#fff':'#18181B',padding:'8px 12px',borderRadius:12,fontFamily:'Inter, sans-serif',fontSize:13,lineHeight:1.5,whiteSpace:'pre-wrap'}}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{alignSelf:'flex-start',background:'#F4F4F5',color:'#A1A1AA',padding:'8px 12px',borderRadius:12,fontFamily:'Inter, sans-serif',fontSize:13}}>...</div>
            )}
          </div>
          <form onSubmit={send} style={{display:'flex',gap:8,padding:12,borderTop:'1px solid #E4E4E7'}}>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Type a message..."
              style={{flex:1,padding:'9px 12px',borderRadius:999,border:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:13,boxSizing:'border-box'}}/>
            <button type="submit" disabled={loading || !input.trim()} style={{padding:'9px 16px',borderRadius:999,border:'none',background:'#18181B',color:'#fff',fontFamily:'Inter, sans-serif',fontSize:13,fontWeight:600,cursor:'pointer'}}>Send</button>
          </form>
        </div>
      )}
    </>
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
  const [checkingOut, setCheckingOut] = useState(false)
  const [showCount, setShowCount] = useState(24)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [page, setPage] = useState(getPageFromHash())
  const [showEmailPopup, setShowEmailPopup] = useState(false)
  const shopRef = useRef(null)
  const blendRef = useRef(null)

  useEffect(() => {
    fetchAllProducts().then(prods => { setProducts(prods); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    function onHashChange() {
      setPage(getPageFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const seen = localStorage.getItem('rs_email_popup_seen')
    if (seen) return
    const t = setTimeout(() => setShowEmailPopup(true), 8000)
    return () => clearTimeout(t)
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

  function goHomeThen(fn) {
    if (page !== 'home') {
      window.location.hash = ''
      setTimeout(fn, 100)
    } else {
      fn()
    }
  }

  function selectRoom(id) {
    goHomeThen(() => {
      setActiveRoom(id); setActiveCat('All'); setSearch(''); setShowCount(24)
      if (id) setTimeout(() => shopRef.current?.scrollIntoView({behavior:'smooth',block:'start'}), 80)
    })
  }

  function addToCart(product, oz, priceCents, sizeLabel) {
    const cartId = `${product.id}__${oz}`
    setCart(prev => {
      const ex = prev.find(i => i.cartId === cartId)
      if (ex) return prev.map(i => i.cartId===cartId ? {...i, qty:i.qty+1} : i)
      return [...prev, { cartId, id: product.id, name: product.name, size: sizeLabel, oz, price_cents: priceCents, qty: 1 }]
    })
    setCartOpen(true)
  }

  async function handleCheckout() {
    if (cart.length === 0 || checkingOut) return
    setCheckingOut(true)
    try {
      const items = cart.map(i => ({ product_id: i.id, qty: i.qty, oz: i.oz }))
      const resp = await fetch(`${API}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await resp.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setCheckingOut(false)
        alert('Something went wrong starting checkout. Please try again.')
      }
    } catch {
      setCheckingOut(false)
      alert('Something went wrong starting checkout. Please try again.')
    }
  }

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'Space Grotesk, sans-serif',fontSize:18,color:'#A1A1AA'}}>Loading Rise and Steep...</div>

  return (
    <div style={{background:'#fff',minHeight:'100vh',position:'relative'}}>

      <div style={{background:'#18181B',color:'#F4F4F5',textAlign:'center',padding:'8px 16px',fontFamily:'Inter, sans-serif',fontSize:12,fontWeight:500}}>
        🌿 Free US shipping on orders $45+
      </div>

      <nav style={{background:'#fff',borderBottom:'1px solid #E4E4E7',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 24px',position:'sticky',top:0,zIndex:30,gap:16,flexWrap:'wrap'}}>
        <img src="logo.png" alt="Rise and Steep" style={{height:44,width:'auto',cursor:'pointer',background:'white',padding:'4px 8px',borderRadius:8}} onClick={()=>{window.location.hash=''; window.scrollTo({top:0,behavior:'smooth'})}}/>
        <input type="text" value={search} onChange={e=>{goHomeThen(()=>{setSearch(e.target.value);setActiveRoom(null);setActiveCat('All');setShowCount(24);shopRef.current?.scrollIntoView({behavior:'smooth',block:'start'})})}}
          placeholder="Search hundreds of herbs, teas & mushrooms..."
          style={{flex:1,maxWidth:320,padding:'8px 14px',borderRadius:999,border:'1px solid #E4E4E7',fontFamily:'Inter, sans-serif',fontSize:13,color:'#18181B',background:'#F9FAFB'}}
        />
        <div style={{display:'flex',gap:20,fontFamily:'Inter, sans-serif',fontSize:13,color:'#52525B'}}>
          <span style={{cursor:'pointer'}} onClick={()=>goHomeThen(()=>shopRef.current?.scrollIntoView({behavior:'smooth'}))}>Shop</span>
          <span style={{cursor:'pointer'}} onClick={()=>goHomeThen(()=>blendRef.current?.scrollIntoView({behavior:'smooth'}))}>Create Blend</span>
          <span style={{cursor:'pointer'}} onClick={()=>window.location.hash='contact'}>Wholesale</span>
          <span style={{cursor:'pointer',fontWeight:page==='about'?700:400,color:page==='about'?'#18181B':'#52525B'}} onClick={()=>window.location.hash='about'}>About</span>
          <span style={{cursor:'pointer',fontWeight:page==='contact'?700:400,color:page==='contact'?'#18181B':'#52525B'}} onClick={()=>window.location.hash='contact'}>Contact</span>
        </div>
        <button onClick={()=>setCartOpen(!cartOpen)} style={{display:'flex',alignItems:'center',gap:8,fontFamily:'Inter, sans-serif',fontSize:13,border:'1px solid #E4E4E7',borderRadius:999,padding:'8px 16px',background:'#fff',cursor:'pointer',color:'#18181B',flexShrink:0}}>
          Cart <span style={{background:'#18181B',color:'#fff',borderRadius:999,fontSize:11,minWidth:18,height:18,display:'inline-flex',alignItems:'center',justifyContent:'center',padding:'0 4px'}}>{cartCount}</span>
        </button>
      </nav>

      {page === 'about' && <AboutPage/>}
      {page === 'contact' && <ContactPage/>}
      {page === 'success' && <SuccessPage onOrderConfirmed={()=>setCart([])}/>}
      {page === 'admin' && <AdminPage/>}
      {page === 'privacy' && <PrivacyPage/>}
      {page === 'terms' && <TermsPage/>}
      {page === 'shipping' && <ShippingPage/>}
      {page === 'faq' && <FAQPage/>}

      {page === 'home' && <>
        <section style={{maxWidth:1100,margin:'0 auto',padding:'56px 24px 48px',display:'flex',gap:40,alignItems:'center',flexWrap:'wrap'}}>
          <div style={{flex:'1 1 360px',minWidth:300}}>
            <div style={{fontFamily:'Space Grotesk, sans-serif',fontSize:11,fontWeight:700,letterSpacing:2.5,color:'#A1A1AA',marginBottom:18}}>HERBAL TEA FOR PERFORMANCE</div>
            <h1 style={{fontFamily:'Space Grotesk, sans-serif',fontWeight:700,fontSize:'clamp(42px,5.5vw,68px)',color:'#18181B',lineHeight:0.95,margin:0,letterSpacing:'-2px'}}>Steep toward<br/><span style={{color:'#A1A1AA'}}>optimal.</span></h1>
            <p style={{fontFamily:'Inter, sans-serif',fontSize:15,color:'#52525B',lineHeight:1.65,marginTop:20,maxWidth:400}}>Select your goal on the wheel or search and browse hundreds of herbs, teas & mushrooms.</p>
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
            {[['456+','Herbs and Botanicals'],['6','Wellness Goals'],['100%','Whole Herbal'],['0','Fillers']].map(([num,label],i) => (
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
                  {filtered.slice(0,showCount).map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} onOpen={setSelectedProduct}/>)}
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
            <p style={{flex:'1 1 300px',fontFamily:'Inter, sans-serif',fontSize:15,color:'#52525B',lineHeight:1.65,margin:0}}>Every blend is built around a specific goal, formulated with precise ratios instead of guesswork, and held to one standard: real ingredients, nothing added just to bulk out a bag. And if you already know what you're after, we carry hundreds of classic herbs and spices on their own too, sold straight and priced by the ounce. No wellness theater. Just what works.</p>
          </div>
        </div>

        <HomeFAQSection/>
      </>}

      <footer style={{borderTop:'1px solid #E4E4E7',padding:'32px 24px'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:24}}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <img src="logo.png" alt="Rise and Steep" style={{height:22,width:'auto'}}/>
            <div style={{fontFamily:'Inter, sans-serif',fontSize:12,color:'#A1A1AA'}}>riseandsteep.com - Herbal tea for performance</div>
          </div>
          <div style={{display:'flex',gap:48,flexWrap:'wrap',fontFamily:'Inter, sans-serif',fontSize:13,color:'#52525B'}}>
            <div>
              <div style={{fontWeight:700,color:'#18181B',marginBottom:6}}>Contact</div>
              <a href={`mailto:${COMPANY.email}`} style={{color:'#52525B',textDecoration:'none',display:'block',marginBottom:4}}>{COMPANY.email}</a>
              <div>{COMPANY.addressLine1}</div>
              <div>{COMPANY.city}, {COMPANY.state} {COMPANY.zip}</div>
              <div>{COMPANY.country}</div>
            </div>
            <div>
              <div style={{fontWeight:700,color:'#18181B',marginBottom:6}}>Company</div>
              <span style={{cursor:'pointer',display:'block',marginBottom:4}} onClick={()=>window.location.hash='about'}>About</span>
              <span style={{cursor:'pointer',display:'block'}} onClick={()=>window.location.hash='contact'}>Contact</span>
            </div>
            <div>
              <div style={{fontWeight:700,color:'#18181B',marginBottom:6}}>Legal</div>
              <span style={{cursor:'pointer',display:'block',marginBottom:4}} onClick={()=>window.location.hash='faq'}>FAQ</span>
              <span style={{cursor:'pointer',display:'block',marginBottom:4}} onClick={()=>window.location.hash='shipping'}>Shipping & Returns</span>
              <span style={{cursor:'pointer',display:'block',marginBottom:4}} onClick={()=>window.location.hash='privacy'}>Privacy Policy</span>
              <span style={{cursor:'pointer',display:'block'}} onClick={()=>window.location.hash='terms'}>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {cartOpen && <>
        <div onClick={()=>setCartOpen(false)} style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.15)',zIndex:39}}/>
        <CartDrawer cart={cart} onClose={()=>setCartOpen(false)}
          onRemove={cartId=>setCart(prev=>prev.filter(i=>i.cartId!==cartId))}
          onQty={(cartId,d)=>setCart(prev=>prev.map(i=>i.cartId===cartId?{...i,qty:i.qty+d}:i).filter(i=>i.qty>0))}
          onCheckout={handleCheckout}
          checkingOut={checkingOut}
        />
      </>}

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={()=>setSelectedProduct(null)} onAdd={addToCart} cartTotalCents={cart.reduce((s,i)=>s+i.price_cents*i.qty,0)}/>
      )}

      {showEmailPopup && page === 'home' && (
        <EmailPopup onClose={()=>setShowEmailPopup(false)}/>
      )}

      <ChatWidget/>
    </div>
  )
}
