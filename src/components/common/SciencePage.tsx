import { motion } from 'framer-motion'
import { ArrowLeft, Brain, Eye, Volume2, Target, Heart, RotateCcw, Clock, Shuffle } from 'lucide-react'

type SciencePageProps = {
  onClose: () => void
}

function Section({ icon: Icon, title, children }: {
  icon: typeof Brain
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-garden-100 rounded-xl">
          <Icon size={20} className="text-garden-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="text-sm text-gray-600 leading-relaxed space-y-3 pl-1">
        {children}
      </div>
    </div>
  )
}

function Source({ text }: { text: string }) {
  return <p className="text-xs text-gray-400 italic mt-2">{text}</p>
}

export function SciencePage({ onClose }: SciencePageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-[var(--color-cream)] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-garden-500 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">The Science Behind This App</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 pb-12">
        <p className="text-sm text-gray-500 mb-6">
          Every design choice in this app is grounded in research on how children
          with dyslexia learn multiplication facts. Here's why things work the way they do.
        </p>

        <Section icon={Brain} title="Why Multiplication Is Harder with Dyslexia">
          <p>
            Unlike addition and subtraction, multiplication facts are stored and retrieved
            through <strong>verbal/phonological pathways</strong> in working memory. When
            your child thinks "6 times 7", their brain retrieves the answer through the
            same language system that dyslexia affects.
          </p>
          <p>
            This is why 30-40% of children with dyslexia also struggle with math fact
            retrieval, even when their mathematical reasoning is strong. It's not a math
            problem — it's a memory encoding problem.
          </p>
          <Source text="Yale Dyslexia Center; PMC studies on dyscalculia-dyslexia comorbidity" />
        </Section>

        <Section icon={Volume2} title="Read Aloud (Text-to-Speech)">
          <p>
            Because multiplication facts rely on the phonological loop, <strong>hearing the
            fact spoken aloud</strong> creates an auditory memory trace that compensates for
            the weaker phonological pathway. The Yale Dyslexia Center specifically recommends
            "naming each step as it is being performed."
          </p>
          <p>
            That's why this app reads every problem aloud ("six times seven") and speaks the
            complete fact after each answer ("six times seven equals forty-two"). Repetitive
            auditory exposure helps encode facts into long-term memory.
          </p>
          <Source text="Yale Dyslexia Center — Math Memory Challenges" />
        </Section>

        <Section icon={Eye} title="Lexend Font and Visual Design">
          <p>
            You may have heard of "dyslexia fonts" like OpenDyslexic. Multiple peer-reviewed
            studies have shown these <strong>don't actually improve reading</strong> — and can
            even slow it down. Dyslexia is a language-processing difference, not a visual one.
          </p>
          <p>
            Instead, this app uses <strong>Lexend</strong>, a font designed by Google for
            general reading fluency. A study of 3rd graders showed measurable improvement in
            reading speed. Combined with the British Dyslexia Association's spacing guidelines
            (wider letter and word spacing, 1.5x line height) and a warm cream background
            instead of harsh white, the text is as readable as possible.
          </p>
          <Source text="PMC 5629233 (OpenDyslexic study, 2017); PMC 5934461 (Dyslexie font study, 2018); BDA Style Guide 2023; Google Design — Lexend" />
        </Section>

        <Section icon={Target} title="The 85% Rule">
          <p>
            A 2019 study in Nature Communications found that learning is mathematically
            optimized when you succeed about <strong>85% of the time</strong> (84.13%,
            precisely). Too easy and there's nothing to learn; too hard and frustration
            blocks learning.
          </p>
          <p>
            This app tracks your child's rolling accuracy and dynamically adjusts which
            problems appear. If they're struggling (below 75%), it offers easier problems
            to rebuild confidence. If they're cruising (above 92%), it introduces harder ones.
            The goal is always that productive sweet spot.
          </p>
          <Source text="Wilson et al., Nature Communications, 2019 — 'Optimal Learning Rate'" />
        </Section>

        <Section icon={Heart} title="No Forced Retry on Wrong Answers">
          <p>
            Many math apps make children immediately retry a problem they got wrong. Research
            shows this creates an <strong>anxiety association</strong> with that specific fact —
            the brain links the fact with the feeling of failure.
          </p>
          <p>
            Instead, when your child gets an answer wrong, they see the correct answer, hear
            it spoken aloud, and get a brief strategy hint. Then the app moves on. The missed
            fact comes back naturally in 3-5 problems — close enough for reinforcement, far
            enough to break the anxiety loop. When it reappears, it's presented as multiple
            choice to rebuild confidence before requiring recall.
          </p>
          <Source text="Research on math anxiety in children with learning differences; error-correction timing studies" />
        </Section>

        <Section icon={Shuffle} title="Incremental Rehearsal (1 New, 9 Known)">
          <p>
            The gold standard in special education for learning new facts is called
            <strong> incremental rehearsal</strong>: introduce just 1-2 new facts per session,
            mixed in with 8-9 facts the child already knows.
          </p>
          <p>
            This creates a high success rate (building confidence) while still making progress
            on new material. The app caps new facts at 2 per session and ensures the rest are
            review. This is far more effective than drilling many new facts at once, which
            leads to interference and frustration.
          </p>
          <Source text="Intervention Central — Incremental Rehearsal for Math Facts; special education best practices" />
        </Section>

        <Section icon={RotateCcw} title="Spaced Repetition">
          <p>
            A landmark 1985 study of 3rd graders found that <strong>spaced practice</strong>
            (reviewing at expanding intervals) produced nearly <strong>twice the retention</strong>
            of massed practice (cramming). The brain consolidates memories during the gaps
            between sessions.
          </p>
          <p>
            Once your child masters a fact, the app brings it back for review at expanding
            intervals — after 1 day, then 3, then 7, then 14, then 28. This "use it or lose
            it" schedule keeps facts fresh without wasting time on unnecessary repetition.
          </p>
          <Source text="Rea & Modigliani, 1985 — spacing effect in multiplication learning" />
        </Section>

        <Section icon={Clock} title="Short Sessions, Always End on a Win">
          <p>
            Research recommends <strong>10-15 minutes maximum</strong> for focused fact
            practice. A typical 9-year-old's attention span is 20-30 minutes for easy tasks,
            but significantly shorter for challenging ones. Two short sessions beat one long
            one.
          </p>
          <p>
            The app also ensures the <strong>last problem in every session</strong> is one
            your child can succeed on. The final memory of a practice session shapes whether
            they want to come back — ending on a positive note keeps motivation alive.
          </p>
          <Source text="Attention span research; session design best practices for learning differences" />
        </Section>

        <div className="mt-8 p-4 bg-garden-50 rounded-2xl">
          <h3 className="text-sm font-semibold text-garden-700 mb-2">What we deliberately left out</h3>
          <ul className="text-sm text-garden-600 space-y-2">
            <li><strong>No timers on answers.</strong> Timed tests are the #1 cause of math anxiety in children.</li>
            <li><strong>No penalty for wrong answers.</strong> Mistakes are reframed as learning moments with strategy hints.</li>
            <li><strong>No leaderboards or competition.</strong> Comparison increases anxiety. The only competition is with yesterday's self.</li>
          </ul>
        </div>

        <p className="text-xs text-gray-400 mt-8 text-center">
          Built with care for learners who think differently.
        </p>
      </div>
    </motion.div>
  )
}
