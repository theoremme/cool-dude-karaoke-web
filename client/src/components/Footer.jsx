import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const HIDDEN_ROUTES = ['/player', '/player-loading', '/privacy', '/terms'];

const Footer = () => {
  const { pathname } = useLocation();
  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <footer className="site-footer">
      <Link to="/privacy">Privacy Policy</Link>
      <span className="site-footer-sep">|</span>
      <Link to="/terms">Terms of Service</Link>
      <span className="site-footer-sep">|</span>
      <a href="mailto:cooldudekaraoke@gmail.com">Contact</a>
      <span className="site-footer-sep">|</span>
      <span>&copy; Cool Dude Karaoke 2026</span>
    </footer>
  );
};

export default Footer;
