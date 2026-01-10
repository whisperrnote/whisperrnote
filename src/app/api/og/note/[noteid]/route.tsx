import { ImageResponse } from 'next/og';
import { validatePublicNoteAccess } from '@/lib/appwrite';

export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ noteid: string }> }
) {
  try {
    const { noteid } = await params;
    const note = await validatePublicNoteAccess(noteid);

    if (!note) {
      return new Response('Note not found', { status: 404 });
    }

    // Helper functions to get preview text from content if title is missing
    const stripMarkdown = (md?: string) => {
       if (!md) return '';
       let text = md.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
       text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
       text = text.replace(/```[\s\S]*?```/g, '');
       text = text.replace(/`[^`]*`/g, '');
       text = text.replace(/^[#>\-\*\+]{1,}\s?/gm, '');
       text = text.replace(/[\*\_\~\#\>]/g, '');
       text = text.replace(/\s+/g, ' ').trim();
       return text;
    };

    const firstParagraph = (md?: string) => {
       const plain = stripMarkdown(md);
       if (!plain) return '';
       const paras = plain.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
       if (paras.length) return paras[0];
       const lines = plain.split(/\n/).map(l => l.trim()).filter(Boolean);
       return lines[0] || plain;
    };

    const truncate = (s: string | undefined, n: number) => {
       if (!s) return '';
       return s.length > n ? s.slice(0, n).trim() + '…' : s;
    };

    const title = note.title && note.title.trim() 
      ? truncate(note.title.trim(), 70) 
      : truncate(firstParagraph(note.content || undefined), 70) || 'Untitled Note';
    
    const date = new Date(note.$createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: '#000000',
            backgroundImage: 'radial-gradient(circle at 0% 0%, #141414 0%, #000000 100%)',
            padding: '80px',
            position: 'relative',
          }}
        >
          {/* Decorative Teal Glow in background */}
          <div
            style={{
              position: 'absolute',
              top: '-150px',
              right: '-150px',
              width: '500px',
              height: '500px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 240, 255, 0.08) 0%, rgba(0, 240, 255, 0) 70%)',
              filter: 'blur(60px)',
            }}
          />

          {/* Top Left Branding */}
          <div
            style={{
              position: 'absolute',
              top: 50,
              left: 60,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                backgroundColor: '#00F0FF',
                borderRadius: '6px',
                marginRight: '14px',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
              }}
            />
            <span
              style={{
                color: '#F2F2F2',
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontFamily: 'sans-serif',
              }}
            >
              Whisperrnote
            </span>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: '40px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  height: '2px',
                  width: '40px',
                  backgroundColor: '#00F0FF',
                  marginRight: '15px',
                }}
              />
              <span
                style={{
                  color: '#00F0FF',
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontFamily: 'sans-serif',
                }}
              >
                Shared Note
              </span>
            </div>
            
            <h1
              style={{
                fontSize: 84,
                fontWeight: 800,
                color: '#F2F2F2',
                lineHeight: 1.1,
                marginBottom: '32px',
                letterSpacing: '-0.04em',
                maxWidth: '1000px',
                fontFamily: 'sans-serif',
                wordBreak: 'break-word',
              }}
            >
              {title}
            </h1>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                color: '#A1A1AA',
                fontSize: 28,
                fontFamily: 'sans-serif',
              }}
            >
              <span>{date}</span>
              <div
                style={{
                  width: 1,
                  height: 24,
                  backgroundColor: '#404040',
                  margin: '0 24px',
                }}
              />
              <span style={{ color: '#F2F2F2', opacity: 0.8 }}>Securely encrypted access</span>
            </div>
          </div>

          {/* Bottom Right Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 60,
              right: 60,
              display: 'flex',
              padding: '16px 32px',
              background: 'rgba(10, 10, 10, 0.7)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                color: '#F2F2F2',
                fontSize: 20,
                fontWeight: 500,
                fontFamily: 'sans-serif',
              }}
            >
               Cognitive Extension
            </span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error(e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
