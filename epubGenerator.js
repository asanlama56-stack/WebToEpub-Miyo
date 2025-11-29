import JSZip from 'jszip';

export const createProperEpub = async (chapters, title, author = 'Unknown') => {
  const zip = new JSZip();

  // Add mimetype (must be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip');

  // Create META-INF folder
  const metaInf = zip.folder('META-INF');
  metaInf.file(
    'container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // Create OEBPS folder
  const oebps = zip.folder('OEBPS');

  // Create content.opf
  const manifest = chapters
    .map((_, i) => `    <item id="chapter${i}" href="chapter${i}.html" media-type="application/xhtml+xml"/>`)
    .join('\n');

  const spine = chapters.map((_, i) => `    <itemref idref="chapter${i}"/>`).join('\n');

  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="uuid_id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>en</dc:language>
    <meta name="date" content="${new Date().toISOString()}"/>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifest}
  </manifest>
  <spine toc="ncx">
${spine}
  </spine>
</package>`;

  oebps.file('content.opf', contentOpf);

  // Create toc.ncx
  const navPoints = chapters
    .map(
      (ch, i) => `    <navPoint id="navPoint${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(ch.title.substring(0, 100))}</text></navLabel>
      <content src="chapter${i}.html"/>
    </navPoint>`
    )
    .join('\n');

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="uuid_${Date.now()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title.substring(0, 200))}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;

  oebps.file('toc.ncx', tocNcx);

  // Create chapter HTML files
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const paragraphs = chapter.content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => `  <p>${escapeXml(line.trim())}</p>`)
      .join('\n');

    const html = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(chapter.title.substring(0, 100))}</title>
  <style>
    body { font-family: Georgia, serif; margin: 1em; }
    h1 { text-align: center; font-size: 1.5em; margin-bottom: 1em; }
    p { text-align: justify; text-indent: 1em; margin: 0 0 0.5em 0; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${escapeXml(chapter.title.substring(0, 100))}</h1>
${paragraphs}
</body>
</html>`;
    oebps.file(`chapter${i}.html`, html);
  }

  // Generate the EPUB file as blob
  const blob = await zip.generateAsync({ type: 'blob' });

  // Convert blob to base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const escapeXml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};
