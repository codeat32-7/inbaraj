import { ResumeData } from '@/lib/types';

interface ContactProps {
  data: ResumeData;
  isolated?: boolean;
}

export default function Contact({ data }: ContactProps) {
  const { contact, personal } = data;

  return (
    <section id="contact">
      <div className="section-label">Let&apos;s talk</div>
      <h2>Open to the right <em>opportunity</em></h2>
      <div className="contact-wrap reveal">
        <div className="contact-left">
          <h3 dangerouslySetInnerHTML={{ __html: contact.heading }} />
          <p style={{ marginBottom: '0.8rem' }}>{contact.description}</p>
          <p>{contact.subtext}</p>
        </div>
        <div className="contact-links">
          <a href={`mailto:${personal.email}`} className="contact-link">
            <div className="contact-link-icon icon-mail">@</div>
            <div className="contact-link-text">
              <div className="contact-link-label">Email</div>
              <div className="contact-link-value">{personal.email}</div>
            </div>
          </a>

          <a href={`tel:${personal.phone}`} className="contact-link">
            <div className="contact-link-icon icon-phone">&#9742;</div>
            <div className="contact-link-text">
              <div className="contact-link-label">Phone</div>
              <div className="contact-link-value">{personal.phone}</div>
            </div>
          </a>

          <a
            href={personal.whatsapp}
            className="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="contact-link-icon icon-wa">&#x1F4AC;</div>
            <div className="contact-link-text">
              <div className="contact-link-label">WhatsApp</div>
              <div className="contact-link-value">Chat on WhatsApp</div>
            </div>
          </a>

          <a
            href={personal.linkedinUrl}
            className="contact-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="contact-link-icon icon-li">in</div>
            <div className="contact-link-text">
              <div className="contact-link-label">LinkedIn</div>
              <div className="contact-link-value">{personal.linkedin}</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
