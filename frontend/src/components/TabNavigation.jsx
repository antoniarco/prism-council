import './TabNavigation.css';
import { Settings } from './Icons';

export default function TabNavigation({ activeTab, onTabChange }) {
  return (
    <div className="tab-navigation">
      <div className="tab-navigation-left">
        <div className="brand">
          <img 
            className="brand-mark navbar-logo" 
            src="/brand/prism-navbar.png" 
            alt="PRISM"
            width="32"
            height="32"
          />
          <div className="brand-text">
            <div className="brand-name">PRISM Council</div>
            <div className="brand-tagline">Decision-grade multi-model reasoning</div>
          </div>
        </div>
        <button
          className={`tab-button ${activeTab === 'conversations' ? 'active' : ''}`}
          onClick={() => onTabChange('conversations')}
        >
          Reasonings
        </button>
        <button
          className={`tab-button ${activeTab === 'contexts' ? 'active' : ''}`}
          onClick={() => onTabChange('contexts')}
        >
          Contexts
        </button>
        <button
          className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => onTabChange('roles')}
        >
          Roles
        </button>
      </div>
      <div className="tab-navigation-right">
        <button
          className={`tab-button-icon ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
          aria-label="Settings"
        >
          <Settings className="icon" size={20} />
        </button>
      </div>
    </div>
  );
}

