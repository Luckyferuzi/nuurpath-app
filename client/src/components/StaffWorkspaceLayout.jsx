import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  getStaffPageMeta,
  getStaffWorkspaceSections,
  isStaffWorkspaceItemActive,
} from '../lib/staffWorkspace.js';

const StaffWorkspaceLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = String(user?.role || '').toLowerCase();
  const navigationSections = getStaffWorkspaceSections(role);
  const pageMeta = getStaffPageMeta(location.pathname);
  const displayName = user?.name || user?.email || 'Staff User';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/staff/login');
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8f5ef_0%,_#f4f0e7_35%,_#f8f7f4_100%)]">
      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#101c2d]/45 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[320px] max-w-[86vw] transform border-r border-[#1e2a3c] bg-[#101c2d] text-white shadow-2xl transition-transform duration-300 lg:static lg:max-w-none lg:translate-x-0 lg:shadow-none ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-6">
              <Link to="/admin" className="block">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#d8c79a]">NuurPath</p>
                <h1 className="mt-2 text-2xl font-black tracking-[0.18em] text-white">Staff Workspace</h1>
              </Link>
              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/60">Signed in as</div>
                <div className="mt-2 text-lg font-bold text-white">{displayName}</div>
                <div className="mt-3 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#d8c79a]">
                  {role || 'staff'}
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              {navigationSections.map((section) => (
                <div key={section.id} className="mb-6">
                  <div className="px-3 text-xs font-black uppercase tracking-[0.26em] text-white/45">
                    {section.label}
                  </div>
                  <div className="mt-3 space-y-2">
                    {section.items.map((item) => {
                      const isActive = isStaffWorkspaceItemActive(location.pathname, item.to);

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`block rounded-[1.4rem] px-4 py-3 transition ${
                            isActive
                              ? 'bg-[#d8c79a] text-[#101c2d] shadow-lg'
                              : 'border border-transparent text-white/85 hover:border-white/10 hover:bg-white/6 hover:text-white'
                          }`}
                        >
                          <div className="text-sm font-bold">{item.label}</div>
                          <div className={`mt-1 text-xs leading-5 ${isActive ? 'text-[#3a4658]' : 'text-white/60'}`}>
                            {item.description}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 px-6 py-5">
              <div className="flex gap-3">
                <Link
                  to="/"
                  className="flex-1 rounded-full border border-white/15 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Public Site
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 rounded-full bg-[#d8c79a] px-4 py-2 text-sm font-semibold text-[#101c2d] transition hover:bg-[#eadfb8]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[#e4ddcf] bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d8cdb7] bg-[#fcfbf8] text-[#101c2d] lg:hidden"
                  aria-label="Open navigation"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                  <span className="sr-only">Open navigation</span>
                </button>
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.24em] text-[#8a7443]">NuurPath Staff</div>
                  <h2 className="truncate text-xl font-black text-[#101c2d] sm:text-2xl">{pageMeta.title}</h2>
                  <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-[#67707e] md:block">
                    {pageMeta.description}
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-3 lg:flex">
                <div className="rounded-full border border-[#e4ddcf] bg-[#fcfbf8] px-4 py-2 text-sm font-semibold text-[#4f5763]">
                  {displayName}
                </div>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default StaffWorkspaceLayout;
