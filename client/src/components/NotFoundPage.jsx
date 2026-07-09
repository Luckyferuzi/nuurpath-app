import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NotFoundPage = () => {
    const { pathname } = useLocation();
    const isStaffRoute = pathname.startsWith('/staff') || pathname.startsWith('/admin');

    return (
        <div className="min-h-[calc(100vh-81px)] bg-[radial-gradient(circle_at_top,_rgba(216,199,154,0.18),_transparent_42%),linear-gradient(180deg,_#f8f3e6_0%,_#f3efe3_100%)] px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#e4dcc7] bg-white p-8 text-center shadow-[0_22px_70px_rgba(16,28,45,0.08)] sm:p-12">
                <p className="text-xs font-black uppercase tracking-[0.35em] text-[#7f6a3d]">404</p>
                <h2 className="mt-4 text-3xl font-black text-[#101c2d] sm:text-4xl">
                    {isStaffRoute ? 'Staff page not found.' : 'This page could not be found.'}
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-[#5d6471] sm:text-base">
                    {isStaffRoute
                        ? 'The staff link you opened does not exist or is no longer available. Use the staff portal entry point below or head back to the public website.'
                        : 'The link you opened does not exist or may have moved. You can return home, browse packages, or continue from one of the main pages below.'}
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link
                        to={isStaffRoute ? '/staff/login' : '/'}
                        className="inline-flex min-w-[190px] items-center justify-center rounded-full bg-[#101c2d] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-white transition hover:bg-[#16263b]"
                    >
                        {isStaffRoute ? 'Open Staff Login' : 'Go Home'}
                    </Link>
                    <Link
                        to={isStaffRoute ? '/' : '/packages'}
                        className="inline-flex min-w-[190px] items-center justify-center rounded-full border border-[#d8c79a] px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#7f6a3d] transition hover:bg-[#fbf6e5]"
                    >
                        {isStaffRoute ? 'Back To Website' : 'Browse Packages'}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
