import { useState } from 'react';
import { PiBook, PiFilmSlate, PiGift, PiMusicNotes } from 'react-icons/pi';

// Music, films, books and gifts, per person.
//
// The links are SEARCH links, not deep links to a specific record. That is a
// deliberate limit: the model gives us a title and an artist, not a Spotify
// track id, and inventing an id would produce dead links or — worse — links to
// the wrong thing. A search URL always lands somewhere useful, works in every
// country's catalogue, and needs no API key, no rate limit and no third-party
// request from our page.
//
// Every suggestion carries the reason it fits. A gift idea that could be given
// to anyone is a failed suggestion, and showing the "why" is what stops the
// list degrading into generic filler nobody trusts.

const q = (value) => encodeURIComponent(String(value || '').trim());

const KINDS = {
  music: {
    label: 'Music',
    Icon: PiMusicNotes,
    title: (item) => item.title,
    // No artist line. The model's attributions were wrong often enough that
    // the field cost more trust than it added; a title alone still searches
    // correctly on both services.
    subtitle: () => '',
    links: (item) => [
      ['Spotify', `https://open.spotify.com/search/${q(item.title)}`],
      ['YouTube', `https://www.youtube.com/results?search_query=${q(`${item.title} song`)}`],
    ],
  },
  movies: {
    label: 'Watch',
    Icon: PiFilmSlate,
    title: (item) => item.title,
    subtitle: (item) => item.year,
    links: (item) => [
      ['TMDB', `https://www.themoviedb.org/search?query=${q(item.title)}`],
      ['Google', `https://www.google.com/search?q=${q(`${item.title} ${item.year || ''} film`)}`],
    ],
  },
  books: {
    label: 'Read',
    Icon: PiBook,
    title: (item) => item.title,
    subtitle: (item) => item.author || '',
    links: (item) => [
      ['Goodreads', `https://www.goodreads.com/search?q=${q(`${item.title} ${item.author || ''}`)}`],
      ['Google', `https://www.google.com/search?q=${q(`${item.title} ${item.author || ''} book`)}`],
    ],
  },
  gifts: {
    label: 'Gift',
    Icon: PiGift,
    title: (item) => item.idea,
    subtitle: () => '',
    links: (item) => [
      ['Google', `https://www.google.com/search?q=${q(`buy ${item.idea}`)}`],
    ],
  },
};

const ORDER = ['music', 'movies', 'books', 'gifts'];

function Panel({ kind, items, color }) {
  const spec = KINDS[kind];
  if (!spec || !items?.length) return null;
  const { Icon } = spec;

  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <h4 className="flex items-center gap-2 text-sm font-semibold" style={{ color }}>
        <Icon className="text-base" aria-hidden="true" />
        {spec.label}
      </h4>

      <ul className="mt-3 grid gap-2">
        {items.slice(0, 4).map((item, index) => {
          const title = spec.title(item);
          if (!title) return null;
          const subtitle = spec.subtitle(item);
          return (
            <li key={`${title}-${index}`} className="rounded-md border border-line bg-well p-3">
              <p className="text-sm font-medium leading-5 text-ink">{title}</p>
              {subtitle && <p className="mt-0.5 text-xs text-ash">{subtitle}</p>}
              {item.why && <p className="mt-1.5 text-xs leading-5 text-smoke">{item.why}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {spec.links(item).map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-line px-2 py-1 text-xs font-medium text-smoke transition hover:border-signal hover:text-ink"
                  >
                    {label} ↗
                  </a>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Recommendations({ recommendations, youName = 'You', themName = 'Them', colorFor }) {
  const people = [
    { key: 'forMainUser', name: youName, data: recommendations?.forMainUser },
    { key: 'forOtherPerson', name: themName, data: recommendations?.forOtherPerson },
  ].filter((person) => person.data && ORDER.some((kind) => person.data[kind]?.length));

  const [active, setActive] = useState(0);

  if (!people.length) return null;

  const person = people[Math.min(active, people.length - 1)];
  const color = colorFor(person.name);

  return (
    <section aria-label="Recommendations">
      <p className="tech-label">Picked for each of you</p>

      {/* Tabs rather than both columns at once. Eight panels stacked is most of
          a phone screen per person, and nobody compares gift ideas side by
          side — they look at one person at a time. */}
      {people.length > 1 && (
        <div className="mt-3 flex gap-1.5">
          {people.map((entry, index) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                index === active ? 'border-signal bg-accentWash text-signalStrong' : 'border-line text-ash hover:text-ink'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: colorFor(entry.name) }}
                aria-hidden="true"
              />
              {entry.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {ORDER.map((kind) => (
          <Panel key={kind} kind={kind} items={person.data?.[kind]} color={color} />
        ))}
      </div>

      <p className="mt-2 text-xs leading-5 text-ash">
        Suggested from what each of you actually talks about. Links open a search —
        we do not track what you click.
      </p>
    </section>
  );
}
