import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PageMeta from '../components/common/PageMeta'
import { ROUTES } from '../seo/routeMeta'
import { Blank, ContentPage, LegalDraftNotice, Section } from '../components/content/ContentPage'

export type LegalDoc = 'privacy' | 'terms' | 'cancellation'

const UPDATED = <Blank>date these were last updated</Blank>

function Privacy() {
  return (
    <>
      <Section title="Who we are">
        <p>
          Bunakar (bunakar.vercel.app) is run by <Blank>legal name of the business or person</Blank>, <Blank>address</Blank>. Questions about your data:{' '}
          <a href="mailto:talmeezmzp@gmail.com" className="text-accent underline underline-offset-4">talmeezmzp@gmail.com</a>.
        </p>
      </Section>
      <Section title="What we collect">
        <ul>
          <li>Your account: name, email address, a hashed (not readable) password, your plan and when it started.</li>
          <li>The designs you save to your account.</li>
          <li>What you send us through the contact form or the Pro list: your name, email and message.</li>
          <li>Ordinary server logs (such as IP addresses) kept by our hosting providers for security and to keep the service running.</li>
        </ul>
        <p>We don&apos;t run advertising, analytics or tracking scripts, and we don&apos;t sell your data.</p>
      </Section>
      <Section title="What stays in your browser">
        <p>
          Your sign-in token and account details, and any design you haven&apos;t saved yet, are kept in your browser&apos;s local storage so the
          site works between visits. Signing out removes the token and account details; drafts stay until you clear them or save.
        </p>
      </Section>
      <Section title="Who processes it">
        <p>The site is hosted on Vercel, the API on Render, and the database on Neon. They store data for us under their own terms and security.</p>
      </Section>
      <Section title="How long we keep it">
        <p>Account data and designs: until you delete your account. Contact messages and Pro list entries: <Blank>retention period</Blank>.</p>
      </Section>
      <Section title="Your rights">
        <p>
          You can ask for a copy of your data, correct it, or have your account and designs deleted, by writing to us from the{' '}
          <Link to="/contact">contact page</Link>. <Blank>applicable law, e.g. India's Digital Personal Data Protection Act, 2023</Blank>
        </p>
      </Section>
    </>
  )
}

function Terms() {
  return (
    <>
      <Section title="Using Bunakar">
        <p>
          These terms apply when you use Bunakar, a service of <Blank>legal name of the business</Blank>. By creating an account or using the
          designers you agree to them.
        </p>
      </Section>
      <Section title="Your account">
        <p>Keep your password private; you&apos;re responsible for what happens on your account. Give a real email address so we can reach you.</p>
      </Section>
      <Section title="Your designs">
        <p>
          Designs you create are yours. You give us only the permission we need to store them, show them to you and, if you share a link, to the
          people you share it with. Templates, motifs and borders in the designer may be used in your designs, including ones you have made
          commercially.
        </p>
      </Section>
      <Section title="Plans">
        <p>
          Free is free. Pro is a subscription with the features described on the <Link to="/pricing">pricing page</Link>; cancelling and refunds are
          covered by the <Link to="/cancellation">cancellation and refund policy</Link>.
        </p>
      </Section>
      <Section title="Fair use">
        <p>Don&apos;t misuse the service: no attempts to break or overload it, no scraping, and no uploading of anything unlawful.</p>
      </Section>
      <Section title="No guarantees">
        <p>
          Bunakar shows how a rug could look; real wool, dyes and weaving vary. We are not a party to any agreement you make with a weaver. The
          service is provided as is; <Blank>limitation of liability wording</Blank>.
        </p>
      </Section>
      <Section title="Law and changes">
        <p>
          These terms are governed by the laws of <Blank>jurisdiction</Blank>. We&apos;ll post any changes here with a new date.
        </p>
      </Section>
    </>
  )
}

function Cancellation() {
  return (
    <>
      <Section title="Cancelling Pro">
        <p>You can cancel Pro at any time. You keep Pro until the end of the period you&apos;ve paid for, then your account moves to Free.</p>
      </Section>
      <Section title="Refunds">
        <p>
          <Blank>refund terms, e.g. a full refund within N days of first paying, none for part periods after that</Blank>
        </p>
      </Section>
      <Section title="Your designs after cancelling">
        <p>Nothing is deleted. Your designs stay on your account; saving new ones needs room under the Free limit.</p>
      </Section>
      <Section title="How to ask">
        <p>
          Write to us from the <Link to="/contact">contact page</Link> with the email on your account.
        </p>
      </Section>
    </>
  )
}

const DOCS: Record<LegalDoc, { body: () => ReactNode }> = {
  privacy: { body: Privacy },
  terms: { body: Terms },
  cancellation: { body: Cancellation },
}

function LegalPage({ doc }: { doc: LegalDoc }) {
  const d = DOCS[doc]
  const Body = d.body
  return (
    <ContentPage title={ROUTES[`/${doc}`].title} intro={<p>Last updated {UPDATED}.</p>}>
      <PageMeta {...ROUTES[`/${doc}`]} canonicalPath={`/${doc}`} />
      <LegalDraftNotice />
      <Body />
    </ContentPage>
  )
}

export default LegalPage
