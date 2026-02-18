'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [date, setDate] = useState(searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' }));

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDate(newDate);
    router.push(`?date=${newDate}`);
  };

  return (
    <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <label style={{ fontWeight: 600 }}>Filtrar por Fecha:</label>
      <input 
        type="date" 
        value={date} 
        onChange={handleDateChange}
        style={{ width: 'auto', marginBottom: 0 }}
      />
      <button 
        onClick={() => router.push('?')} 
        className="btn"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        Ver Todo
      </button>
    </div>
  );
}
