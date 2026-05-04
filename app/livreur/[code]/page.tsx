'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LivreurPage({ params }: { params: { code: string } }) {
  const [debug, setDebug] = useState<string>('Démarrage...')

  useEffect(() => {
    const test = async () => {
      setDebug('Connexion Supabase...')
      
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!url || !key) {
        setDebug('❌ Variables env manquantes ! URL: ' + url + ' KEY: ' + (key ? 'OK' : 'MANQUANTE'))
        return
      }

      setDebug('Variables OK, recherche livreur: ' + params.code)

      const { data, error } = await supabase
        .from('livreurs')
        .select('*')
        .limit(5)

      if (error) {
        setDebug('❌ Erreur Supabase: ' + JSON.stringify(error))
        return
      }

      setDebug('✅ Résultat: ' + JSON.stringify(data))
    }

    test()
  }, [params.code])

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', padding: '20px', color: 'white', fontFamily: 'monospace' }}>
      <h2>Debug LIV-001</h2>
      <pre style={{ color: '#1D9E75', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{debug}</pre>
    </div>
  )
}