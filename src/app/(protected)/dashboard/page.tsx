'use client';

import React from 'react';

// Placeholder for future tRPC calls if needed on this page directly
// import { api } from "~/trpc/react";

export default function DashboardPage() {
  // const hello = api.post.hello.useQuery({ text: "from tRPC" }); // Example tRPC call

  return (
    <div className="container">
      <h1>Interview Dashboard</h1>

      <div className="card">
        <h2>Prepare for your Interview</h2>
        <p>Paste your Job Description and Resume below to get started.</p>
        
        <div>
          <label htmlFor="jobDescription">Job Description</label>
          <textarea 
            id="jobDescription" 
            rows={10} 
            placeholder="Paste the full job description here..."
          />
        </div>

        <div>
          <label htmlFor="resume">Your Resume</label>
          <textarea 
            id="resume" 
            rows={10} 
            placeholder="Paste your full resume text here..."
          />
        </div>

        <button className="button">
          Start Technical Lead Session
        </button>
      </div>

      <div className="card">
        <h2>Session History</h2>
        <p>Your past interview sessions for the current JD/Resume will appear here.</p>
        {/* Placeholder for MvpSessionHistoryList component */}
        <ul>
          <li>Session 1 - Technical Lead - Completed 2024-07-30 (View Report)</li>
          <li>Session 2 - Technical Lead - In Progress (Resume)</li>
        </ul>
      </div>

      {/* Example of using a tRPC query if needed later */}
      {/* <div className="card">
        <h2>tRPC Test</h2>
        <p>{hello.data ? hello.data.greeting : "Loading tRPC query..."}</p>
      </div> */}
    </div>
  );
} 