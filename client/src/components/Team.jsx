import React, { useState } from 'react';

const Team = () => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [filterRole, setFilterRole] = useState('All');

  const teamMembers = [
    {
      name: "Ahmed Ali",
      role: "Lead Developer",
      image: "https://placehold.co/400x400/0B1C3E/D4AF37?text=AA",
      bio: "Expert in full-stack development with a passion for creating seamless user experiences.",
      skills: ["React", "Node.js", "MongoDB", "System Architecture"],
      socials: { linkedin: "#", github: "#" },
      email: "ahmed@nuurpath.com",
      resume: "#"
    },
    {
      name: "Sarah Khan",
      role: "UI/UX Designer",
      image: "https://placehold.co/400x400/0B1C3E/D4AF37?text=SK",
      bio: "Creative designer focused on intuitive and accessible interfaces.",
      skills: ["Figma", "Adobe XD", "Prototyping", "User Research"],
      socials: { linkedin: "#", github: "#" },
      email: "sarah@nuurpath.com",
      resume: "#"
    },
    {
      name: "Omar Farooq",
      role: "Backend Engineer",
      image: "https://placehold.co/400x400/0B1C3E/D4AF37?text=OF",
      bio: "Specialist in scalable server architectures and database management.",
      skills: ["Python", "PostgreSQL", "Docker", "API Design"],
      socials: { linkedin: "#", github: "#" },
      email: "omar@nuurpath.com",
      resume: "#"
    },
    {
      name: "Fatima Yusuf",
      role: "Project Manager",
      image: "https://placehold.co/400x400/0B1C3E/D4AF37?text=FY",
      bio: "Ensuring timely delivery and high-quality standards for all projects.",
      skills: ["Agile", "Scrum", "Risk Management", "Communication"],
      socials: { linkedin: "#", github: "#" },
      email: "fatima@nuurpath.com",
      resume: "#"
    }
  ];

  const roles = ['All', ...new Set(teamMembers.map(member => member.role))];
  const filteredMembers = filterRole === 'All' 
    ? teamMembers 
    : teamMembers.filter(member => member.role === filterRole);

  return (
    <div className="bg-gray-50 min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-black uppercase tracking-widest text-[#0B1C3E] mb-4">Our Software Team</h1>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mb-6"></div>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Meet the dedicated professionals behind the NuurPath digital experience. We are committed to excellence and innovation.
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-6 py-2 rounded-full font-bold text-sm transition-all uppercase tracking-wider ${
                filterRole === role
                  ? 'bg-[#0B1C3E] text-white shadow-lg transform scale-105'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredMembers.map((member, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
              <div 
                className="h-64 overflow-hidden relative cursor-pointer"
                onClick={() => setSelectedMember(member)}
              >
                <img 
                  src={member.image} 
                  alt={member.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 font-bold uppercase tracking-widest text-sm transition-opacity bg-[#0B1C3E]/80 px-4 py-2 rounded-full backdrop-blur-sm">View Details</span>
                </div>
              </div>
              <div className="p-6 text-center">
                <h3 className="text-xl font-bold text-[#0B1C3E] mb-1">{member.name}</h3>
                <p className="text-[#D4AF37] font-bold text-xs uppercase tracking-widest mb-4">{member.role}</p>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">{member.bio}</p>
                
                <div className="flex justify-center gap-4">
                  {member.socials?.linkedin && (
                    <a href={member.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0077b5] transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </a>
                  )}
                  {member.socials?.github && (
                    <a href={member.socials.github} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Member Modal */}
      {selectedMember && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedMember(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden relative animate-fadeInUp flex flex-col md:flex-row"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 right-4 bg-white/80 hover:bg-white text-gray-600 rounded-full p-2 transition-colors z-10 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="md:w-2/5 h-64 md:h-auto relative">
              <img src={selectedMember.image} alt={selectedMember.name} className="w-full h-full object-cover" />
            </div>
            <div className="md:w-3/5 p-8 flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-[#0B1C3E] mb-2">{selectedMember.name}</h2>
              <p className="text-[#D4AF37] font-bold text-sm uppercase tracking-widest mb-6">{selectedMember.role}</p>
              <p className="text-gray-600 leading-relaxed mb-8 text-lg">{selectedMember.bio}</p>
              
              <h4 className="font-bold text-[#0B1C3E] text-sm mb-3 uppercase tracking-wide">Core Skills</h4>
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedMember.skills.map((skill, idx) => (
                  <span key={idx} className="bg-gray-100 text-[#0B1C3E] px-3 py-1 rounded-full text-xs font-bold border border-gray-200">{skill}</span>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <a 
                    href={`mailto:${selectedMember.email}`}
                    className="bg-[#0B1C3E] text-white px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-[#1a2f55] transition-colors shadow-md flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Contact
                  </a>
                  {selectedMember.resume && (
                    <a 
                      href={selectedMember.resume}
                      download
                      className="border-2 border-[#0B1C3E] text-[#0B1C3E] px-6 py-2 rounded-lg font-bold text-sm uppercase tracking-wider hover:bg-[#0B1C3E] hover:text-white transition-colors shadow-md flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Resume
                    </a>
                  )}
                  <div className="flex gap-4">
                  {selectedMember.socials?.linkedin && (
                    <a href={selectedMember.socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0077b5] transition-colors">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </a>
                  )}
                  {selectedMember.socials?.github && (
                    <a href={selectedMember.socials.github} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </a>
                  )}
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;