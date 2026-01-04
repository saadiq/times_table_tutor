import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAttemptsStore } from '../../stores/attemptsStore'
import type { DailySummary } from '../../types'

const WEEKS = 15
const DAYS_PER_WEEK = 7

function getIntensityClass(count: number): string {
  if (count === 0) return 'bg-gray-200'
  if (count <= 10) return 'bg-garden-200'
  if (count <= 25) return 'bg-garden-400'
  return 'bg-garden-600'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type DayCell = {
  date: string
  summary: DailySummary | null
}

function generateCalendarDays(): DayCell[] {
  const days: DayCell[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Calculate total cells (15 weeks * 7 days)
  const totalCells = WEEKS * DAYS_PER_WEEK

  // Start from (totalCells - 1) days ago to end on today
  for (let i = totalCells - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    days.push({
      date: date.toISOString().split('T')[0],
      summary: null,
    })
  }

  return days
}

export function ActivityCalendar() {
  const [expanded, setExpanded] = useState(false)
  const [selectedDay, setSelectedDay] = useState<DayCell | null>(null)

  const getDailySummaries = useAttemptsStore(state => state.getDailySummaries)
  const getStreakDays = useAttemptsStore(state => state.getStreakDays)
  const getTodayStats = useAttemptsStore(state => state.getTodayStats)

  const todayStats = getTodayStats()
  const streakDays = getStreakDays()
  const summaries = getDailySummaries(WEEKS * DAYS_PER_WEEK)

  // Build calendar with summaries
  const calendarDays = generateCalendarDays()
  const summaryMap = new Map(summaries.map(s => [s.date, s]))
  for (const day of calendarDays) {
    day.summary = summaryMap.get(day.date) || null
  }

  // Split into weeks (columns) for grid display
  const weeks: DayCell[][] = []
  for (let i = 0; i < calendarDays.length; i += DAYS_PER_WEEK) {
    weeks.push(calendarDays.slice(i, i + DAYS_PER_WEEK))
  }

  const handleDayClick = (day: DayCell) => {
    setSelectedDay(selectedDay?.date === day.date ? null : day)
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* Stats row - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
        aria-expanded={expanded}
        aria-controls="activity-calendar-grid"
      >
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-semibold text-garden-600">{todayStats.attempts}</span>
            <span className="text-gray-500 ml-1">today</span>
          </div>
          <div>
            <span className="font-semibold text-garden-600">{todayStats.accuracy}%</span>
            <span className="text-gray-500 ml-1">accuracy</span>
          </div>
          <div>
            <span className="font-semibold text-warm-500">{streakDays}</span>
            <span className="text-gray-500 ml-1">day streak</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expandable calendar grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id="activity-calendar-grid"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              {/* Calendar grid - weeks as columns, days as rows */}
              <div className="flex gap-1 overflow-x-auto pb-2">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map(day => (
                      <button
                        key={day.date}
                        onClick={() => handleDayClick(day)}
                        className={`w-4 h-4 rounded-sm ${getIntensityClass(day.summary?.attemptCount || 0)}
                          hover:ring-2 hover:ring-garden-500 transition-all`}
                        aria-label={`${formatDate(new Date(day.date))}: ${day.summary?.attemptCount || 0} attempts`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end gap-1 mt-2 text-xs text-gray-500">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-gray-200" />
                <div className="w-3 h-3 rounded-sm bg-garden-200" />
                <div className="w-3 h-3 rounded-sm bg-garden-400" />
                <div className="w-3 h-3 rounded-sm bg-garden-600" />
                <span>More</span>
              </div>

              {/* Day detail popup */}
              <AnimatePresence>
                {selectedDay && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-3 p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="font-medium text-gray-700">
                      {formatDate(new Date(selectedDay.date))}
                    </div>
                    {selectedDay.summary ? (
                      <div className="mt-1 space-y-1 text-gray-600">
                        <div>{selectedDay.summary.attemptCount} attempts</div>
                        <div>
                          {selectedDay.summary.correctCount} correct (
                          {Math.round(
                            (selectedDay.summary.correctCount / selectedDay.summary.attemptCount) * 100
                          )}
                          %)
                        </div>
                        <div>{selectedDay.summary.factsAttempted.length} unique facts</div>
                      </div>
                    ) : (
                      <div className="mt-1 text-gray-500">No practice this day</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
