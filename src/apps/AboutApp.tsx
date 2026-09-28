import { aboutRows, personal, socials } from '../data/portfolio';
import { useWM } from '../system/WindowManager';
import { AppIcon, type IconName } from '../components/AppIcons';
import { openExternal } from '../system/notify';

const SOCIAL: [string, string, IconName][] = [
  ['GitHub', socials.github, 'github'],
  ['LinkedIn', socials.linkedin, 'linkedin'],
  ['Instagram', socials.instagram, 'instagram'],
  ['Facebook', socials.facebook, 'facebook'],
  ['Threads', socials.threads, 'threads'],
  ['Spotify', socials.spotify, 'spotify'],
];

export default function AboutApp() {
  const wm = useWM();
  return (
    <div className="about scroll-smooth">
      <img className="about-photo" src={personal.avatar} alt={`Portrait of ${personal.name}`} width={96} height={96} />
      <h1 className="about-name">{personal.name}</h1>
      <p className="about-title">{personal.shortTitle}</p>
      <dl className="about-rows">
        {aboutRows.map((r) => (
          <div key={r.label} className="about-row">
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="about-bio">
        My name is {personal.name}. I am a Computer Science undergraduate and aspiring full-stack developer from {personal.location}, building web, mobile
        and desktop applications that bring together user interfaces, server-side logic, databases and RESTful APIs. {personal.objective}
      </p>
      <div className="about-actions">
        <button type="button" className="btn btn-primary" onClick={() => wm.open('preview')}>
          Open CV
        </button>
        <a className="btn" href={socials.github} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>
        <a className="btn" href={socials.linkedin} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      </div>
      <div className="about-social" aria-label="Social profiles">
        {SOCIAL.map(([label, url, icon]) => (
          <button key={label} type="button" className="about-social-btn" title={label} aria-label={label} onClick={() => openExternal(url, { title: `Opening ${label}`, app: 'Safari', icon: 'safari' })}>
            <AppIcon name={icon} />
          </button>
        ))}
      </div>
    </div>
  );
}
