import React, { useState, useEffect } from 'react';
import Hero from '../components/Hero';
import ProductList from '../components/ProductList';
import { supabase } from '../lib/supabase';

export default function Home() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAds() {
            try {
                const { data, error } = await supabase
                    .from('ads')
                    .select('*')
                    .eq('status', 'active')
                    .order('paid_at', { ascending: false });

                if (error) throw error;

                // Transform data to match UI component
                const formattedProducts = data.map(ad => {
                    // Calculate days since submission with 2 decimals (minimum 0.01 to avoid division by zero)
                    const daysSinceSubmission = Math.max(0.01,
                        parseFloat(((Date.now() - new Date(ad.paid_at).getTime()) / (1000 * 60 * 60 * 24)).toFixed(2))
                    );

                    return {
                        id: ad.id,
                        title: ad.title,
                        domain: new URL(ad.link).hostname,
                        description: ad.description,
                        paidAmount: ad.bid_amount_usdc,
                        txHash: ad.tx_hash,
                        // Relevance = (amount * 1000) / days
                        relevanceScore: ((ad.bid_amount_usdc * 1000) / daysSinceSubmission).toFixed(1),
                        timeAgo: 'Just now'
                    };
                });

                setProducts(formattedProducts);
            } catch (err) {
                console.error('Error fetching ads:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchAds();
    }, []);

    return (
        <div className="home-page">
            <Hero />
            <ProductList products={products} />
        </div>
    );
}
