import { parseHtml } from '@/lib/parseHtml';

export interface TimelineEvent {
  date: string;
  event: string;
}

interface ActressBioProps {
  /** Birth name if different from stage name */
  birthName?: string;
  /** Timeline of events */
  timeline: TimelineEvent[];
  /** Optional filmography */
  filmography?: string[];
}

export default function ActressBio({ birthName, timeline, filmography }: ActressBioProps) {
  return (
    <div className="actress-bio">
      {/* Timeline - CSS Grid with fixed-width date column */}
      <div className="timeline">
        {timeline.map((item, index) => (
          <div key={index} className="timeline-row">
            <div className="timeline-date">{item.date}</div>
            <div className="timeline-event">{parseHtml(item.event)}</div>
          </div>
        ))}
      </div>

      {/* Filmography */}
      {filmography && filmography.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-3">Filmography</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            {filmography.map((film, index) => (
              <li key={index}>{parseHtml(film)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
