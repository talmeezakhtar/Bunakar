import PageMeta from '../components/common/PageMeta'
import { ROUTES } from '../seo/routeMeta'
import { ContentPage, Section } from '../components/content/ContentPage'

/** The 3D models in the courtyard, credited as their CC BY 4.0 licence asks. */
const MODELS = [
  { name: 'Palm Tree Realistic', by: '00amza', href: 'https://sketchfab.com/3d-models/palm-tree-realistic-ced3b31f14f940d0b7480a83e6f8c9c0' },
  { name: 'Arabian Hanging Lamps', by: 'cha', href: 'https://sketchfab.com/3d-models/arabian-hanging-lamps-c8eafb62343b4d258f0480af923f3e91' },
  { name: 'Arabian Lounge', by: "Vinnie D'Cruz", href: 'https://sketchfab.com/3d-models/arabian-lounge-0d41f477dded458998f23d67372c7391' },
  { name: 'Arabian Oil Lamp', by: 'rhcreations', href: 'https://sketchfab.com/3d-models/arabian-oil-lamp-007504cbe0c94042b191021ec41bc246' },
]

function CreditsPage() {
  return (
    <ContentPage title="Credits" intro={<p>The work of others that Bunakar is built with.</p>}>
      <PageMeta {...ROUTES['/credits']} canonicalPath="/credits" />
      <Section title="3D models in the courtyard">
        <ul>
          {MODELS.map((m) => (
            <li key={m.name}>
              <a href={m.href} target="_blank" rel="noreferrer">
                {m.name}
              </a>{' '}
              by {m.by}
            </li>
          ))}
        </ul>
        <p>
          Used under{' '}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
            CC BY 4.0
          </a>
          , resized and compressed for the web. Some models use only some of their pieces.
        </p>
      </Section>
      <Section title="Type">
        <p>El Messiri and Instrument Sans, under the SIL Open Font License.</p>
      </Section>
    </ContentPage>
  )
}

export default CreditsPage
