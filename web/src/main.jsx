import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// Local Vite talks to the bridge on 8787. The Docker image serves UI and API together,
// so production calls stay on the same origin and never point at a visitor's localhost.
const bridgeBase = import.meta.env.VITE_API_BASE ?? (window.location.port === '5173' ? 'http://127.0.0.1:8787' : '')
const apiUrl = path => `${bridgeBase}${path}`
const localDownloadUrl = 'https://github.com/ThiruThanikaiarasu/idea-evaluator/archive/refs/heads/main.zip'
const hostedBuild = import.meta.env.VITE_DEPLOYMENT_TARGET === 'vercel'

const agents = [
  { id: 'cto', initials: 'CT', name: 'Skeptical CTO', role: 'Feasibility & scale', behavior: 'Assumes data, integrations, and operations break until proven otherwise.', thinking: ['checking scale assumptions', 'pricing the infra bill', 'probing the data model', 'finding the operational trap'] },
  { id: 'user', initials: 'BU', name: 'Bored User', role: 'Usefulness & retention', behavior: 'Impatiently asks why they would open this again.', thinking: ['asking why open this twice', 'hunting the 10-second payoff', 'comparing it to doing nothing', 'testing it against habit'] },
  { id: 'competitor', initials: 'CP', name: 'Competitor', role: 'Alternatives & differentiation', behavior: 'Looks for how an incumbent can copy, bundle, or underprice it.', thinking: ['sizing up your wedge', 'checking what is copyable', 'timing a fast follow', 'scanning for a real moat'] },
  { id: 'friend', initials: 'HF', name: 'Honest Friend', role: 'Scope & founder reality', behavior: 'Protects the team from a project they will not finish or operate.', thinking: ['reading between the lines', 'finding the avoided question', 'checking the honest scope', 'drafting the hard question'] }
]

const executionOptions = [
  { id: 'openai-api', label: 'OpenAI API', detail: 'Your key is used only for this run.', kind: 'API' },
  { id: 'anthropic-api', label: 'Claude API', detail: 'Your key is used only for this run.', kind: 'API' },
  { id: 'groq-api', label: 'Groq API', detail: 'Your key is used only for this run.', kind: 'API' },
  { id: 'local-cli', label: 'Local CLI', detail: 'Use Codex or Claude already authenticated on this machine.', kind: 'CLI' }
]

const scoreLabels = {
  audience: 'Audience', problem: 'Problem', businessValue: 'Business value', revenue: 'Revenue', competitiveGap: 'Competitive gap',
  differentiation: 'Differentiation', feasibility: 'Feasibility', needToExist: 'Need to exist',
  riskReadiness: 'Risk readiness', validationReadiness: 'Validation readiness'
}

function Scorecard({ scores, reasons = {}, overallScore, threshold = 6, title = 'Confidence scorecard' }) {
  if (!scores) return null
  const fields = [
    ...Object.entries(scoreLabels).map(([key, label]) => [key, label, scores[key], reasons[key]])
  ]
  const score = Number(overallScore || 0)
  const workable = score >= threshold
  return <section className="scorecard"><div className="scorecard-heading"><div><p className="eyebrow">{title}</p><span>0–10 confidence with a short reason per dimension</span></div><div className={`overall-score ${workable ? 'workable' : 'needs-work'}`}><b>{score.toFixed(1)}</b><small>/ 10 overall</small><em>{workable ? 'Workable direction' : 'Resolve before building'}</em></div></div><div className="score-grid">{fields.map(([key, label, value, reason]) => { const numeric = Number(value || 0); return <div className="score-cell" key={key}><b>{numeric.toFixed(1)}</b><span>{label}</span><i><i style={{ width: `${numeric * 10}%` }} /></i>{reason && <p>{reason}</p>}</div> })}</div></section>
}

function PersonaCritiques({ critiques = [], name }) {
  if (!critiques.length) return null
  return <section className="persona-critiques"><div><p className="eyebrow">{name}'s own critique</p><h2>What this perspective adds.</h2></div><div className="critique-list">{critiques.map((critique, index) => <article className="critique-card" key={`${critique.title}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{critique.title}</h3><p>{critique.detail}</p></div></article>)}</div></section>
}

function MentorThinking({ selectedFeedback }) {
  const steps = [
    'Reading your direction',
    ...selectedFeedback.map(id => `Weighing the ${agents.find(agent => agent.id === id)?.name || id}'s feedback`),
    'Resolving the strongest score gaps',
    'Writing the final idea'
  ]
  const [step, setStep] = useState(0)
  useEffect(() => {
    // Estimated pacing; the last step holds until the real response arrives.
    const timer = setInterval(() => setStep(current => Math.min(current + 1, steps.length - 1)), 2600)
    return () => clearInterval(timer)
  }, [steps.length])
  return (
    <div className="mentor-thinking" aria-live="polite">
      {steps.map((label, index) => {
        const state = index < step ? 'done' : index === step ? 'active' : ''
        return (
          <div className={`mentor-step ${state}`} key={label} style={{ '--i': index }}>
            <span className="step-dot">{state === 'done' ? '✓' : ''}</span>
            <span className="step-label">{label}{state === 'active' ? '…' : ''}</span>
          </div>
        )
      })}
      <div className="scanline" />
    </div>
  )
}

function App() {
  const [page, setPage] = useState('ideas')
  const [ideas, setIdeas] = useState([])
  const [selectedIdea, setSelectedIdea] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [reviewerPhase, setReviewerPhase] = useState('soul')
  const [evaluation, setEvaluation] = useState(null)
  const [runState, setRunState] = useState('idle')
  const [runError, setRunError] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState([])
  const [mentorRevision, setMentorRevision] = useState(null)
  const [mentorState, setMentorState] = useState('select')
  const [customInstruction, setCustomInstruction] = useState('')
  const [workabilityThreshold, setWorkabilityThreshold] = useState(6)
  const [humanReflections, setHumanReflections] = useState({})
  const reflectionTimers = useRef({})
  const runtimeConfigRef = useRef(null)
  const [approval, setApproval] = useState(null)
  const [artifactUrl, setArtifactUrl] = useState('')
  const [artifactTitle, setArtifactTitle] = useState('')
  const [artifactSaved, setArtifactSaved] = useState(false)
  const [history, setHistory] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [storyIdea, setStoryIdea] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [executionMode, setExecutionMode] = useState(hostedBuild ? 'openai-api' : 'codex-cli')
  const [model, setModel] = useState('Codex default')
  const [apiKey, setApiKey] = useState('')
  const [connectionState, setConnectionState] = useState('idle')
  const [setupNotice, setSetupNotice] = useState('')
  const [draft, setDraft] = useState({ title: '', description: '' })
  const [thinkTick, setThinkTick] = useState(0)

  useEffect(() => {
    if (runState !== 'running') return
    const timer = setInterval(() => setThinkTick(tick => tick + 1), 2400)
    return () => clearInterval(timer)
  }, [runState])

  const canVisit = target => target === 'ideas' ? true
    : target === 'room' ? Boolean(selectedIdea)
    : target === 'reviewer' ? Boolean(selectedIdea && selectedAgent)
    : target === 'panel' || target === 'mentor' ? Boolean(evaluation)
    : target === 'artifact' ? Boolean(evaluation && (mentorRevision || approval))
    : target === 'history' ? Boolean(history)
    : false

  const pageRef = useRef(page)
  pageRef.current = page
  const canVisitRef = useRef(canVisit)
  canVisitRef.current = canVisit
  const poppingRef = useRef(false)
  // Each roast/resume starts a new "journey"; browser-back never replays pages
  // from an earlier iteration with the current iteration's data.
  const journeyRef = useRef(0)

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  useEffect(() => {
    // Mirror in-app pages into browser history so back/forward buttons work.
    if (poppingRef.current) { poppingRef.current = false; return }
    if (window.history.state?.page === page) return
    if (window.history.state == null) window.history.replaceState({ page, journey: journeyRef.current }, '')
    else window.history.pushState({ page, journey: journeyRef.current }, '')
  }, [page])

  useEffect(() => {
    const onPop = event => {
      const target = event.state?.page
      if (!target) return
      const sameJourney = (event.state.journey ?? 0) === journeyRef.current
      const destination = sameJourney && canVisitRef.current(target) ? target : 'ideas'
      if (destination === pageRef.current) return
      poppingRef.current = true
      setPage(destination)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const isLocalCli = executionMode === 'codex-cli' || executionMode === 'claude-cli' || executionMode === 'antigravity-cli'
  const availableExecutionOptions = hostedBuild ? executionOptions.filter(option => option.kind === 'API') : executionOptions
  const selectedExecution = isLocalCli ? executionOptions.find(option => option.id === 'local-cli') : availableExecutionOptions.find(option => option.id === executionMode)
  const needsKey = selectedExecution?.kind === 'API'
  const reviews = evaluation?.reviews || []
  const panelReady = runState === 'done' && reviews.length === agents.length
  const panelOverall = reviews.length ? reviews.reduce((total, review) => total + Number(review.overallScore || 0), 0) / reviews.length : 0
  const isWorkable = panelOverall >= workabilityThreshold

  useEffect(() => {
    fetch(apiUrl('/api/ideas'))
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(result => setIdeas(result.ideas || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!evaluation?.runId) return
    setHumanReflections(evaluation.humanReflections || {})
    setCustomInstruction(evaluation.finalInstruction || '')
    setWorkabilityThreshold(Number(evaluation.workabilityThreshold || 6))
  }, [evaluation?.runId])

  useEffect(() => {
    if (!evaluation?.runId) return
    fetch(apiUrl('/api/evaluation/draft'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ideaId: selectedIdea.id, evaluationId: evaluation.runId, workabilityThreshold }) })
  }, [workabilityThreshold, evaluation?.runId, selectedIdea?.id])

  useEffect(() => {
    if (!evaluation?.runId || !customInstruction) return
    const timer = setTimeout(() => fetch(apiUrl('/api/evaluation/draft'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ideaId: selectedIdea.id, evaluationId: evaluation.runId, finalInstruction: customInstruction }) }), 700)
    return () => clearTimeout(timer)
  }, [customInstruction, evaluation?.runId, selectedIdea?.id])

  async function addIdea(event) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.description.trim()) return
    const response = await fetch(apiUrl('/api/ideas'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    })
    if (!response.ok) return
    const result = await response.json()
    setIdeas(current => [result.idea, ...current])
    setDraft({ title: '', description: '' })
    setShowForm(false)
  }

  async function roast(idea, { preserveMentor = false } = {}) {
    if (!ensureRuntimeConfigured()) return
    journeyRef.current += 1
    setSelectedIdea(idea)
    setSelectedAgent(null)
    setEvaluation(null)
    setRunError('')
    if (!preserveMentor) {
      setSelectedFeedback([])
      setMentorRevision(null)
      setMentorState('select')
    }
    setRunState('running')
    setPage('room')
    try {
      const response = await fetch(apiUrl('/api/evaluate/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: executionMode, model, apiKey, ideaId: idea.id, idea })
      })
      if (!response.ok || !response.body) throw new Error('The evaluation stream could not start.')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        lines.filter(Boolean).forEach(line => {
          const event = JSON.parse(line)
          if (event.type === 'panel_started') setEvaluation(event.evaluation)
          if (event.type === 'reviewer_complete') {
            setEvaluation(current => ({ ...current, reviews: [...(current?.reviews || []), event.review] }))
            setSelectedAgent(current => current || agents.find(agent => agent.id === event.agentId))
          }
          if (event.type === 'reviewer_failed') {
            setEvaluation(current => ({ ...current, failedAgents: [...(current?.failedAgents || []), { agentId: event.agentId, error: event.error }] }))
          }
          if (event.type === 'complete') {
            setEvaluation(event.evaluation)
            setRunState('done')
          }
          if (event.type === 'error') throw new Error(event.error)
        })
      }
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'The evaluation failed.')
      setRunState('error')
    }
  }

  async function retryReviewer(agent) {
    if (!ensureRuntimeConfigured()) return
    if (!evaluation?.runId) return
    setRunError('')
    setEvaluation(current => ({ ...current, retryingAgentId: agent.id }))
    try {
      const response = await fetch(apiUrl('/api/review/retry'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: executionMode, model, apiKey, ideaId: selectedIdea.id, evaluationId: evaluation.runId, agentId: agent.id })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'This reviewer could not be retried.')
      setEvaluation(result.evaluation)
      setSelectedAgent(agent)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'This reviewer could not be retried.')
      setEvaluation(current => ({ ...current, retryingAgentId: null }))
    }
  }

  async function resumeIdea(idea) {
    journeyRef.current += 1
    const response = await fetch(apiUrl(`/api/ideas/${idea.id}/state`))
    if (!response.ok) return
    const state = await response.json()
    const latestEvaluation = state.evaluations[0]
    const latestRevision = state.mentorRevisions.at(-1)
    const latestApproval = state.approvals.at(-1)
    const latestArtifact = state.artifacts.at(-1)
    setSelectedIdea(state.idea)
    setEvaluation(latestEvaluation || null)
    setApproval(latestApproval || null)
    setArtifactSaved(Boolean(latestArtifact))
    setMentorRevision(latestRevision || null)
    if (latestRevision && (!latestEvaluation || latestRevision.createdAt > latestEvaluation.createdAt)) {
      setMentorRevision(latestRevision)
      setMentorState('done')
      setPage('mentor')
    } else if (latestApproval && !latestArtifact) {
      setArtifactTitle(`${state.idea.title} · pitch brief`)
      setPage('artifact')
    } else {
      setPage('panel')
    }
  }

  async function viewHistory(idea) {
    const response = await fetch(apiUrl(`/api/ideas/${idea.id}/state`))
    if (!response.ok) return
    setHistory(await response.json())
    setPage('history')
  }

  function openMentor(preserveFeedback = false) {
    if (!preserveFeedback) setSelectedFeedback([])
    setCustomInstruction('')
    setMentorRevision(null)
    setMentorState('select')
    setPage('mentor')
  }

  function toggleFeedback(agentId) {
    setSelectedFeedback(current => current.includes(agentId) ? current.filter(item => item !== agentId) : [...current, agentId])
  }

  function updateReflection(agentId, reflection) {
    setHumanReflections(current => ({ ...current, [agentId]: reflection }))
    clearTimeout(reflectionTimers.current[agentId])
    reflectionTimers.current[agentId] = setTimeout(() => {
      if (!evaluation?.runId) return
      fetch(apiUrl('/api/evaluation/draft'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ideaId: selectedIdea.id, evaluationId: evaluation.runId, agentId, reflection }) })
    }, 700)
  }

  async function runMentor() {
    if (!ensureRuntimeConfigured()) return
    setMentorState('running')
    try {
      const response = await fetch(apiUrl(`/api/ideas/${selectedIdea.id}/mentor`), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: executionMode, model, apiKey, evaluationId: evaluation.runId, selectedFeedback, customInstruction })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The mentor run failed.')
      setMentorRevision(result.mentorRevision)
      setMentorState('done')
    } catch (error) {
      setRunError(error instanceof Error ? error.message : 'The mentor run failed.')
      setMentorState('error')
    }
  }

  function beginMentor() {
    setPage('mentor')
    runMentor()
  }

  async function approveDirection() {
    const response = await fetch(apiUrl(`/api/ideas/${selectedIdea.id}/approvals`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluationId: evaluation.runId, decision: 'approved', notes: 'Approved by the human reviewer.' })
    })
    const result = await response.json()
    if (response.ok) {
      setApproval(result.approval)
      setArtifactTitle(`${selectedIdea.title} · pitch brief`)
      setPage('artifact')
    }
  }

  async function saveArtifact(event) {
    event.preventDefault()
    const response = await fetch(apiUrl(`/api/ideas/${selectedIdea.id}/artifacts`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: artifactTitle, url: artifactUrl, approvalId: approval?.id, metadata: { evaluationId: evaluation.runId } })
    })
    if (response.ok) setArtifactSaved(true)
  }

  function selectExecution(option) {
    const nextMode = option.id === 'local-cli' ? (isLocalCli ? executionMode : 'codex-cli') : option.id
    setExecutionMode(nextMode)
    setConnectionState('idle')
    setSetupNotice('')
    setModel(nextMode === 'groq-api' ? 'llama-3.3-70b-versatile' : nextMode === 'openai-api' ? 'gpt-5' : nextMode === 'anthropic-api' ? 'claude-sonnet-4-6' : nextMode === 'codex-cli' ? 'Codex default' : nextMode === 'claude-cli' ? 'Claude default' : 'Antigravity default')
    requestAnimationFrame(() => runtimeConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  function selectLocalCli(mode) {
    setExecutionMode(mode)
    setModel(mode === 'codex-cli' ? 'Codex default' : mode === 'claude-cli' ? 'Claude default' : 'Antigravity default')
    setConnectionState('idle')
    setSetupNotice('')
    requestAnimationFrame(() => runtimeConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  async function testConfiguration() {
    if (needsKey && !apiKey.trim()) {
      setConnectionState('needs-key')
      setSetupNotice(`Add a ${selectedExecution?.label || 'provider'} key before running the agents.`)
      return
    }
    setConnectionState('testing')
    try {
      const response = await fetch(apiUrl('/api/health'))
      const health = await response.json()
      const ready = needsKey || health.runtimes?.[executionMode]
      setConnectionState(ready ? 'ready' : 'runtime-missing')
      setSetupNotice(ready ? 'Connection ready. You can now roast an idea.' : `Install and authenticate ${selectedExecution?.label || 'the selected local CLI'} before continuing.`)
    } catch {
      setConnectionState('bridge-required')
      setSetupNotice('Start the local bridge or connect this hosted app to its API bridge before running agents.')
    }
  }

  function ensureRuntimeConfigured() {
    const label = selectedExecution?.label || 'selected runtime'
    if (needsKey && !apiKey.trim()) {
      setConnectionState('needs-key')
      setSetupNotice(`Connect ${label}: paste an API key, then check the configuration before roasting.`)
      setShowSettings(true)
      return false
    }
    if (connectionState !== 'ready') {
      setSetupNotice(`Connect ${label}: check the configuration before roasting an idea.`)
      setShowSettings(true)
      return false
    }
    return true
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setPage('ideas')} aria-label="Go to ideas"><span className="brand-mark">✦</span><span>idea evaluator</span></button>
        <nav className="stepper" aria-label="Evaluation progress"><button className={page === 'ideas' || page === 'history' ? 'active' : ''} onClick={() => setPage('ideas')}>1. Ideas</button><i /><button className={page === 'room' || page === 'reviewer' ? 'active' : ''} disabled={!canVisit('room')} onClick={() => setPage('room')}>2. Review room</button><i /><button className={page === 'panel' || page === 'mentor' ? 'active' : ''} disabled={!canVisit('panel')} onClick={() => setPage('panel')}>3. Panel</button><i /><button className={page === 'artifact' ? 'active' : ''} disabled={!canVisit('artifact')} onClick={() => setPage('artifact')}>4. Pitch</button></nav>
        <div className="topbar-actions"><span className="mode">{selectedExecution?.label}</span><button className="settings-button" onClick={() => setShowSettings(true)} aria-label="Open run settings">⚙</button></div>
      </header>

      {page === 'ideas' && <section className={`ideas-page page-enter ${ideas.length ? '' : 'is-empty'}`}>
        <div className="hero-copy"><p className="eyebrow">A multi-agent product review</p><h1>Bring an idea.<br />Leave with a better next action.</h1><p>Enter an idea, send it to independent perspectives, then decide what is worth testing with real people.</p></div>
        <div className="ideas-toolbar"><div><p className="eyebrow">Idea board</p><h2>{ideas.length ? `${ideas.length} ideas waiting` : 'Start with one idea'}</h2></div><button className="primary-button" onClick={() => setShowForm(true)}><b>+</b> New idea</button></div>
        <div className="idea-list">{ideas.map((idea, index) => <article className="idea-row" key={idea.id}><span className="idea-number">{String(index + 1).padStart(2, '0')}</span><div className="idea-copy"><h3>{idea.title}</h3><p>{idea.description}</p></div><div className="idea-actions"><button className="icon-button" onClick={() => setStoryIdea(idea)} title="View full story" aria-label={`View the full story of ${idea.title}`}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="15" y2="17" /></svg></button>{idea.iterationCount > 0 && <button className="icon-button" onClick={() => viewHistory(idea)} title="View history" aria-label={`View the history of ${idea.title}`}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></svg></button>}<button className="roast-button" onClick={() => idea.iterationCount > 0 ? resumeIdea(idea) : roast(idea)}>{idea.iterationCount > 0 ? 'Iteration' : 'Roast it'} <span>→</span></button></div></article>)}</div>
        {!ideas.length && <div className="empty-state"><p className="eyebrow">No saved ideas</p><h3>Add the first idea to begin an evaluation.</h3><p>Your input—not a preset example—will be sent to the reviewer agents.</p></div>}
        <p className="footer-note">A roast is not a verdict. Every claim still needs real-world evidence.</p>
      </section>}

      {page === 'room' && <section className="room-page page-enter">
        <div className="room-topline"><div><p className="eyebrow">Review room</p><h1>{selectedIdea?.title}</h1></div><div className={`run-chip ${runState}`}><span className="pulse" />{runState === 'running' ? 'Agents are reviewing' : runState === 'done' ? 'Review complete' : runState === 'error' ? 'Review failed' : 'Awaiting runtime'}</div></div>
        <p className="idea-description">{selectedIdea?.description}</p>
        <div className="room-layout">
          <div className="agent-grid agent-grid-full" aria-label="Agent review panel">{agents.map((agent, index) => { const review = evaluation?.reviews.find(item => item.agentId === agent.id); const failure = evaluation?.failedAgents?.find(item => item.agentId === agent.id); const retrying = evaluation?.retryingAgentId === agent.id; const tileState = review ? 'complete' : retrying ? 'retrying' : failure ? 'failed' : runState === 'running' ? 'running' : 'waiting'; const phrase = agent.thinking[(thinkTick + index) % agent.thinking.length]; return <button className={`agent-tile ${tileState}`} key={agent.id} style={{ '--i': index }} onClick={() => failure ? retryReviewer(agent) : (setSelectedAgent(agent), setReviewerPhase('soul'), setPage('reviewer'))}><span className="avatar">{agent.initials}{tileState === 'complete' && <i className="avatar-check">✓</i>}</span><span className="agent-tile-copy"><b>{agent.name}</b><small>{agent.role}</small></span>{review && <span className="tile-score">{Number(review.overallScore).toFixed(1)}<small>/10</small></span>}<span className={`agent-state ${review ? 'complete' : failure ? 'failed' : ''}`} key={tileState === 'running' ? phrase : tileState}>{review ? 'Open scores →' : retrying ? <>Retrying <i className="spin">↻</i></> : failure ? 'Retry this reviewer ↻' : runState === 'running' ? `${phrase}…` : 'Waiting'}</span><i className={`scanline ${tileState === 'running' || tileState === 'retrying' ? 'active' : ''}`} /></button>})}</div>
        </div>
        <div className="room-footer"><span className="room-progress"><span className="progress-track"><span className="progress-fill" style={{ transform: `scaleX(${reviews.length / agents.length})` }} /></span><span className="progress-count" key={reviews.length}>{reviews.length} of {agents.length} perspectives complete</span></span><button className="primary-button" disabled={!panelReady} onClick={() => setPage('panel')}>{panelReady ? 'Compare the panel' : runState === 'running' ? 'Agents are still reviewing…' : 'Awaiting completed review'} <span>→</span></button></div>
      </section>}

      {page === 'reviewer' && selectedAgent && <section className="reviewer-page page-enter">{(() => { const review = evaluation?.reviews.find(item => item.agentId === selectedAgent.id); const index = agents.findIndex(agent => agent.id === selectedAgent.id); const next = agents[index + 1]; return <><div className="reviewer-heading"><p className="eyebrow">{reviewerPhase === 'soul' ? 'Step 1 · score baseline' : `Step 2 · ${selectedAgent.role}`}</p><h1>{reviewerPhase === 'soul' ? 'The scorecard.' : selectedAgent.name}</h1><p>{review?.summary || (reviewerPhase === 'soul' ? 'Scores are confidence signals, not facts. The next screen shows this persona’s independent rating.' : selectedAgent.behavior)}</p></div>{review ? reviewerPhase === 'soul' ? <article className="reviewer-detail soul-step"><div className="shared-chip">0–10 confidence baseline</div><Scorecard scores={review.scores} reasons={review.reasons} overallScore={review.overallScore} threshold={workabilityThreshold} /><div className="reviewer-actions"><button className="secondary-button" onClick={() => setPage('room')}>Choose another agent</button><button className="primary-button" onClick={() => setReviewerPhase('perspective')}>View {selectedAgent.name}'s critique <span>→</span></button></div></article> : <article className="reviewer-detail"><button className="baseline-link" onClick={() => setReviewerPhase('soul')}>View score baseline</button><PersonaCritiques critiques={review.personaCritiques} name={selectedAgent.name} /><label className="reviewer-reflection"><span>Your response to this critique</span><textarea value={humanReflections[selectedAgent.id] || ''} onChange={event => updateReflection(selectedAgent.id, event.target.value)} placeholder="What do you agree with, challenge, or want the mentor to address?" /></label><div className="reviewer-actions"><button className="secondary-button" onClick={() => setPage('room')}>Choose another agent</button><button className="primary-button" onClick={() => next ? (setSelectedAgent(next), setReviewerPhase('perspective')) : setPage('panel')}>{next ? `Next: ${next.name} →` : 'Review all inputs →'}</button></div></article> : <div className="thinking-panel agent-thinking"><span className="avatar large">{selectedAgent.initials}</span><p className="thinking-phrase" key={runState === 'running' ? thinkTick : 'idle'}>{runState === 'running' ? `${selectedAgent.thinking[(thinkTick + index) % selectedAgent.thinking.length]}…` : 'This reviewer has not finished yet.'}</p><i className={`scanline ${runState === 'running' ? 'active' : ''}`} /></div>}</>})()}</section>}

      {page === 'panel' && evaluation && <section className="panel-page page-enter">
        <div className="panel-heading"><p className="eyebrow">Panel comparison · human-controlled</p><h1>What should<br />change the idea?</h1><p>There is no fifth agent deciding for you. Compare the same Idea Soul baseline across the panel, then choose the feedback the mentor is allowed to use.</p></div>
        <div className="panel-callout score-verdict"><div><span>Collective confidence</span><b>{panelOverall.toFixed(1)}<small>/ 10</small></b></div><div><label>Workability threshold<select value={workabilityThreshold} onChange={event => setWorkabilityThreshold(Number(event.target.value))}>{[5, 6, 7].map(score => <option key={score} value={score}>{score}/10</option>)}</select></label><p>{isWorkable ? `At or above ${workabilityThreshold}/10: this is a workable direction. Use the mentor to resolve its lowest scores.` : `Below ${workabilityThreshold}/10: resolve the weakest scores before investing in a build.`}</p></div></div>
        <div className="panel-review-grid panel-review-compact">{reviews.map(review => { const agent = agents.find(item => item.id === review.agentId); return <button type="button" className={`panel-review ${selectedFeedback.includes(review.agentId) ? 'selected' : ''}`} key={review.agentId} onClick={() => toggleFeedback(review.agentId)}><span className="avatar">{agent?.initials}</span><span><p className="eyebrow">{agent?.name || review.agentId}</p><b>{agent?.role}</b></span><strong className="review-score">{Number(review.overallScore || 0).toFixed(1)}<small>/10</small></strong><span className="feedback-toggle">{selectedFeedback.includes(review.agentId) ? 'Selected ✓' : 'Choose'}</span></button>})}</div>
        <section className="panel-human-checkpoint"><div><p className="eyebrow">Your instruction to the mentor</p><h2>{selectedFeedback.length ? `${selectedFeedback.length} perspective${selectedFeedback.length === 1 ? '' : 's'} selected.` : 'Choose the perspectives that matter.'}</h2><p>Tell the mentor which weak scores to address and what you want to preserve. It will return one concise final idea with a fresh scorecard.</p><label className="custom-instruction"><span>Your direction</span><textarea value={customInstruction} onChange={event => setCustomInstruction(event.target.value)} placeholder="e.g. Raise feasibility and validation readiness without making the first version broader." /></label></div><div className="panel-actions"><button className="secondary-button" onClick={() => setPage('ideas')}>Evaluate another idea</button><button className="primary-button" disabled={!selectedFeedback.length || !customInstruction.trim()} onClick={beginMentor}>Refine final idea <span>→</span></button></div></section>
      </section>}

      {page === 'mentor' && evaluation && <section className="mentor-page page-enter">
        <div className="mentor-heading"><p className="eyebrow">Mentor synthesis · human-guided</p><h1>Refine the<br />final idea.</h1><p>The mentor uses your direction and only the selected scores. It returns one clearer final idea; it does not create a pitch or approve the idea.</p></div>
        {mentorState === 'running' && <MentorThinking selectedFeedback={selectedFeedback} />}
        {mentorState === 'error' && <div className="thinking-panel"><p>{runError}</p><button className="primary-button" onClick={beginMentor}>Try mentor again</button></div>}
        {mentorRevision && mentorRevision.revision.finalIdea && <section className="revision-result"><p className="eyebrow">Final idea</p><h2>{mentorRevision.revision.finalIdea.title}</h2><p>{mentorRevision.revision.finalIdea.description}</p><Scorecard scores={mentorRevision.revision.finalIdea.scores} reasons={mentorRevision.revision.finalIdea.reasons} overallScore={mentorRevision.revision.finalIdea.overallScore} threshold={workabilityThreshold} title="Final confidence" /><label className="custom-instruction"><span>Editable final idea for another review</span><input value={mentorRevision.revision.finalIdea.title} onChange={event => setMentorRevision(current => ({ ...current, revision: { ...current.revision, finalIdea: { ...current.revision.finalIdea, title: event.target.value } } }))} /><textarea value={mentorRevision.revision.finalIdea.description} onChange={event => setMentorRevision(current => ({ ...current, revision: { ...current.revision, finalIdea: { ...current.revision.finalIdea, description: event.target.value } } }))} /></label></section>}
        {mentorState === 'done' && mentorRevision?.revision.finalIdea && <div className="mentor-action"><div><p className="eyebrow">Human checkpoint</p><h2>{Number(mentorRevision.revision.finalIdea.overallScore) >= workabilityThreshold ? 'This is workable. Resolve the weaker scores as you build.' : 'This needs another review before you build.'}</h2></div><div className="mentor-buttons"><button className="secondary-button" onClick={() => { setArtifactTitle(`${mentorRevision.revision.finalIdea.title} · artifact`); setPage('artifact') }}>Create an artifact</button><button className="primary-button" onClick={() => roast({ id: selectedIdea.id, title: mentorRevision.revision.finalIdea.title, description: mentorRevision.revision.finalIdea.description }, { preserveMentor: true })}>Re-evaluate this idea <span>→</span></button></div></div>}
      </section>}

      {page === 'artifact' && evaluation && <section className="artifact-page page-enter">
        <div className="artifact-heading"><p className="eyebrow">Human-approved direction · pitch artifact</p><h1>Turn the direction<br />into a story.</h1><p>Create your Claude Artifact from this human-approved evaluation, then save its link here so the full trail stays with the idea.</p></div>
        <article className="artifact-preview"><div className="artifact-cover"><span>{selectedIdea.title}</span><p>{selectedIdea.description}</p><small>HUMAN-APPROVED DIRECTION</small></div><div className="artifact-sections"><section><span>01</span><div><h3>Selected panel input</h3><p>{mentorRevision?.selectedFeedback?.length ? `${mentorRevision.selectedFeedback.length} reviewer perspectives shaped this revision.` : 'This direction was reviewed by the full panel.'}</p></div></section><section><span>02</span><div><h3>What to validate next</h3><p>Use the artifact to state the problem, testable direction, assumptions, and evidence you will collect.</p></div></section><section><span>03</span><div><h3>Decision ownership</h3><p>This direction was approved by a human after the revised idea returned to the panel.</p></div></section></div></article>
        <form className="artifact-save" onSubmit={saveArtifact}><p className="eyebrow">Save your Claude Artifact</p><label>Artifact title<input value={artifactTitle} onChange={event => setArtifactTitle(event.target.value)} required /></label><label>Artifact URL<input type="url" value={artifactUrl} onChange={event => setArtifactUrl(event.target.value)} placeholder="https://claude.ai/artifacts/..." required /></label><button className="primary-button" type="submit">{artifactSaved ? 'Artifact link saved' : 'Save artifact link'} <span>→</span></button></form>
      </section>}

      {page === 'history' && history && <section className="summary-page page-enter">
        <div className="summary-heading"><p className="eyebrow">Saved evaluation timeline</p><h1>{history.idea.title}</h1></div>
        <div className="history-list">{history.evaluations.slice().reverse().map(item => { const score = item.reviews?.length ? item.reviews.reduce((sum, review) => sum + Number(review.overallScore || 0), 0) / item.reviews.length : 0; return <article className="history-card" key={item.runId}><p className="eyebrow">Iteration {item.iteration} · {item.createdAt.slice(0, 10)}</p><h2>{score.toFixed(1)} / 10 panel confidence</h2><details><summary>Show saved reflections and instruction</summary><p>{Object.values(item.humanReflections || {}).filter(Boolean).join(' · ') || 'No reviewer reflections saved yet.'}</p><p>{item.finalInstruction || 'No final mentor instruction saved yet.'}</p></details><button className="story-button" onClick={() => { journeyRef.current += 1; setSelectedIdea(history.idea); setEvaluation(item); setWorkabilityThreshold(Number(item.workabilityThreshold || 6)); setPage('panel') }}>Open score panel →</button></article>})}{history.mentorRevisions.map(item => <article className="history-card" key={item.id}><p className="eyebrow">Mentor final idea</p><h2>{item.revision.finalIdea?.title || item.revision.title || 'Saved mentor revision'}</h2><p>{item.revision.finalIdea ? `${Number(item.revision.finalIdea.overallScore).toFixed(1)} / 10 confidence` : item.revision.description}</p></article>)}{history.artifacts.map(item => <article className="history-card" key={item.id}><p className="eyebrow">Saved artifact</p><h2><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></h2></article>)}</div>
      </section>}

      {showForm && <div className="modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setShowForm(false) }}><form className="idea-modal" onSubmit={addIdea}><button type="button" className="close" onClick={() => setShowForm(false)} aria-label="Close">×</button><p className="eyebrow">New idea</p><h2>What should we challenge?</h2><label>Idea title<input autoFocus value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. SkillSwap" /></label><label>Full story<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} placeholder="Describe who has the problem, their context, and the proposed solution." /></label><button className="primary-button" type="submit">Add to the board <span>→</span></button></form></div>}
      {storyIdea && <div className="modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setStoryIdea(null) }}><article className="story-modal"><header className="story-modal-header"><div><p className="eyebrow">Idea story</p><h2>{storyIdea.title}</h2></div><button type="button" className="close" onClick={() => setStoryIdea(null)} aria-label="Close">×</button></header><div className="story-modal-content" tabIndex="0" aria-label="Full idea story"><p className="story-body">{storyIdea.description}</p></div><div className="story-modal-footer"><span>This exact story will be the runtime input.</span><button className="primary-button" onClick={() => { setStoryIdea(null); roast(storyIdea) }}>Roast this story <span>→</span></button></div></article></div>}
      {showSettings && <div className="modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setShowSettings(false) }}>
        <section className="settings-modal">
          <button type="button" className="close" onClick={() => setShowSettings(false)} aria-label="Close">×</button>
          <p className="eyebrow">Run settings</p>
          <h2>Choose a runtime.</h2>
          <p className="settings-intro">{hostedBuild ? 'This hosted version uses API providers. API keys are held only in this tab for the current request and are never saved to the evaluation or database.' : 'CLI modes use this machine. API keys are held only in this tab for the current request and are never saved to the evaluation or database.'}</p>
          {setupNotice && <div className={`setup-notice ${connectionState === 'ready' ? 'ready' : 'warning'}`} role="status"><b>{connectionState === 'ready' ? 'Ready' : 'Connection required'}</b><span>{setupNotice}</span></div>}
          <div className="execution-options">{availableExecutionOptions.map(option => <button type="button" key={option.id} className={`execution-option ${selectedExecution?.id === option.id ? 'selected' : ''}`} onClick={() => selectExecution(option)} aria-pressed={selectedExecution?.id === option.id}><span className="execution-radio" /><span><b>{option.label}</b><small>{option.detail}</small></span><em>{option.kind}</em></button>)}</div>
          <div className="local-download" ref={runtimeConfigRef}>
            <div><p className="eyebrow">{hostedBuild ? 'Need a local CLI?' : 'Want to run it locally?'}</p><p>{hostedBuild ? <>Codex, Claude, and Antigravity CLI run only on your own machine. Download the local evaluator and follow <code>INSTRUCTIONS.md</code>.</> : <>Download the source, Docker setup, and <code>INSTRUCTIONS.md</code>. No saved ideas or keys are included.</>}</p></div>
            <a className="secondary-button" href={localDownloadUrl}>Download local evaluator ↓</a>
          </div>
          <div className="runtime-config">
            {isLocalCli && <div className="local-cli-picker"><span>Choose your local CLI</span><div><button className={executionMode === 'codex-cli' ? 'selected' : ''} onClick={() => selectLocalCli('codex-cli')}>Codex CLI</button><button className={executionMode === 'claude-cli' ? 'selected' : ''} onClick={() => selectLocalCli('claude-cli')}>Claude CLI</button><button className={executionMode === 'antigravity-cli' ? 'selected' : ''} onClick={() => selectLocalCli('antigravity-cli')}>Antigravity CLI</button></div></div>}
            <label className="settings-field">Model<input value={model} onChange={event => setModel(event.target.value)} /></label>
            {needsKey && <label className="settings-field">Temporary API key<input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="Used only for this browser session" autoComplete="off" /></label>}
            <p className="key-note">{needsKey ? 'The key is forwarded to the bridge for this run only; it is never persisted.' : `Uses the local authenticated ${executionMode === 'codex-cli' ? 'Codex' : executionMode === 'claude-cli' ? 'Claude' : 'Antigravity'} CLI.`}</p>
            <div className="settings-footer"><span className={`connection-state ${connectionState}`}>{connectionState === 'testing' ? 'Checking configuration…' : connectionState === 'ready' ? 'Configuration ready' : connectionState === 'needs-key' ? 'Add an API key to continue' : connectionState === 'runtime-missing' ? 'Selected CLI is not installed' : connectionState === 'bridge-required' ? 'Start the local bridge first' : 'Not connected'}</span><button className="primary-button" onClick={testConfiguration}>Check configuration</button></div>
          </div>
        </section>
      </div>}
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
