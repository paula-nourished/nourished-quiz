'use client';
import dynamic from 'next/dynamic';
const QuizClient = dynamic(() => import('./QuizClient.jsx'), { ssr: false });
export default function Page(){return <div style={{minHeight:300,display:'grid',placeItems:'center'}}><QuizClient/></div>;}
