import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => (
  <div className="app">
    <div className="legal-page">
      <Link to="/" className="legal-back">&larr; Back</Link>
      <div className="legal-content">
        <h1>Privacy Policy</h1>
        <p className="legal-meta"><strong>Effective Date:</strong> May 23, 2026<br /><strong>Last Updated:</strong> May 23, 2026</p>

        <h2>1. Introduction</h2>
        <p>This Privacy Policy describes how Cool Dude Karaoke ("we," "us," or "our") collects, uses, stores, and shares information when you use our service at <a href="https://www.cooldudekaraoke.com">cooldudekaraoke.com</a> (the "Service"). By using the Service, you agree to the practices described in this policy.</p>

        <h2>2. Use of YouTube API Services</h2>
        <p>Cool Dude Karaoke uses <strong>YouTube API Services</strong> to search for karaoke videos and to embed video playback within our application via the YouTube IFrame Player.</p>
        <p>By using Cool Dude Karaoke, you agree to be bound by the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a>.</p>
        <p>Cool Dude Karaoke's use of information received from YouTube API Services adheres to YouTube's API Services Terms and is subject to Google's privacy practices, described in the <strong><a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></strong>.</p>
        <p>You can revoke Cool Dude Karaoke's access to your Google data at any time via the Google security settings page: <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer">https://security.google.com/settings/security/permissions</a>.</p>

        <h2>3. Information We Collect</h2>

        <h3>3.1 Information You Provide</h3>
        <ul>
          <li><strong>Account information:</strong> Your email address and chosen display name when you sign up.</li>
          <li><strong>Room and session data:</strong> Room names, room codes, and the songs you add to the karaoke queue during an active session.</li>
          <li><strong>Communications:</strong> If you contact us by email, we retain the contents of that message.</li>
        </ul>

        <h3>3.2 YouTube API Data</h3>
        <p>When you search for or play songs, we receive the following data from the YouTube Data API and YouTube IFrame Player:</p>
        <ul>
          <li>Video titles, channel names, and video IDs</li>
          <li>Video durations</li>
          <li>Thumbnail images</li>
          <li>Playback state (play, pause, ended) needed to coordinate the karaoke queue in real time</li>
        </ul>
        <p>This YouTube API Data is held <strong>in memory only</strong>, for the duration of your active karaoke session. We do not write video metadata to a persistent database.</p>

        <h3>3.3 Automatically Collected Information</h3>
        <ul>
          <li><strong>Log data:</strong> Our servers may log IP address, browser type, request paths, and timestamps for security, abuse prevention, and debugging.</li>
          <li><strong>Cookies and similar technologies:</strong> We use cookies and browser local storage on your device to:
            <ul>
              <li>Keep you signed in (authentication session)</li>
              <li>Remember your display name and room preferences</li>
              <li>Maintain real-time WebSocket connections used to synchronize the karaoke queue across users in your room</li>
            </ul>
          </li>
        </ul>
        <p>You can control cookies via your browser settings, though some features of the Service may not function correctly without them.</p>

        <h2>4. How We Use Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Authenticate you and maintain your sign-in session</li>
          <li>Enable real-time collaboration between users in the same karaoke room (queue updates, playback state)</li>
          <li>Display YouTube search results and play embedded YouTube videos</li>
          <li>Diagnose technical issues, prevent abuse, and protect the security of the Service</li>
          <li>Communicate with you about your account or material changes to the Service</li>
        </ul>
        <p>We <strong>do not sell your personal information</strong>, and we <strong>do not use your information for advertising</strong>.</p>

        <h2>5. How We Share Information</h2>
        <p>We share information only as described below:</p>
        <ul>
          <li><strong>With other users in your room.</strong> Your display name, the songs you add to the queue, and your queue actions are visible to other users in the same karaoke room.</li>
          <li><strong>With service providers</strong> who help us operate the Service:
            <ul>
              <li><strong>Railway</strong> — application and database hosting</li>
              <li><strong>Google / YouTube</strong> — video search via the YouTube Data API and video playback via the YouTube IFrame Player API</li>
            </ul>
          </li>
          <li><strong>For legal reasons.</strong> We may disclose information if required by law, valid legal process, or to protect the rights, property, or safety of our users or the public.</li>
        </ul>
        <p>When an embedded YouTube video plays within Cool Dude Karaoke, YouTube may set its own cookies and collect its own data subject to the <a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.</p>

        <h2>6. Data Retention</h2>
        <ul>
          <li><strong>Account information</strong> (email, display name) is retained while your account is active. You can request deletion at any time.</li>
          <li><strong>Room and session data</strong> (queues, song selections, real-time activity) is ephemeral and is discarded when the room closes — always within 24 hours.</li>
          <li><strong>YouTube API Data</strong> is never persisted; it is held in memory only for the duration of an active session.</li>
          <li><strong>Server logs</strong> are retained for up to 30 days for security and debugging, then automatically deleted.</li>
        </ul>

        <h2>7. Your Choices and Rights</h2>
        <p>You may:</p>
        <ul>
          <li>Request access to the personal information we hold about you</li>
          <li>Request correction or deletion of your account and associated data</li>
          <li>Revoke Cool Dude Karaoke's access to your Google/YouTube data at any time at <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer">https://security.google.com/settings/security/permissions</a></li>
        </ul>
        <p>To exercise any of these rights, contact us at the email address in Section 10.</p>

        <h2>8. Children's Privacy</h2>
        <p>Cool Dude Karaoke is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Material changes will be reflected by updating the "Last Updated" date above and, where appropriate, by an in-app notice or email to registered users.</p>

        <h2>10. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy or our data practices, contact us at:</p>
        <p><strong>Email:</strong> <a href="mailto:cooldudekaraoke@gmail.com">cooldudekaraoke@gmail.com</a><br /><strong>Website:</strong> <a href="https://www.cooldudekaraoke.com">https://www.cooldudekaraoke.com</a></p>
      </div>
      <footer className="site-footer">
        <Link to="/privacy">Privacy Policy</Link>
        <span className="site-footer-sep">|</span>
        <Link to="/terms">Terms of Service</Link>
        <span className="site-footer-sep">|</span>
        <a href="mailto:cooldudekaraoke@gmail.com">Contact</a>
        <span className="site-footer-sep">|</span>
        <span>&copy; Cool Dude Karaoke 2026</span>
      </footer>
    </div>
  </div>
);

export default PrivacyPolicy;
