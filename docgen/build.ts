import fs from 'fs';
import path from 'path';

const files = ['index.html', '.nojekyll'];
const ignoreFiles = ['_sidebar.md'];

// Helper function to check file existence
const fileExists = async (filePath: string) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
};

// Helper function to ensure directory exists
const ensureDirectoryExists = async (dirPath: string) => {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    console.log(`Directory created or already exists: ${dirPath}`);
  } catch (err) {
    console.error(`Error creating directory: ${dirPath}`, err);
  }
};

(async () => {
  const docsDir = __dirname;
  const outDir = path.join(__dirname, '../docs');

  try {
    const filesInFolder = await fs.promises.readdir(docsDir);
    const mdFiles = filesInFolder.filter(f => f.endsWith('.md') && !ignoreFiles.includes(f));

    console.log(`Files in folder: ${filesInFolder}`);
    console.log(`Markdown files to copy: ${mdFiles}`);

    // Ensure destination directory exists
    await ensureDirectoryExists(outDir);

    // Copy specific files
    for (const f of files) {
      const src = path.join(docsDir, f);
      const dest = path.join(outDir, f);
      if (await fileExists(src)) {
        try {
          await fs.promises.copyFile(src, dest);
          console.log(`Copied ${src} to ${dest}`);
        } catch (err) {
          console.error(`Error copying ${src} to ${dest}:`, err);
        }
      } else {
        console.warn(`File not found: ${src}`);
      }
    }

    // Copy Markdown files
    for (const f of mdFiles) {
      const src = path.join(docsDir, f);
      const dest = path.join(outDir, f);
      if (await fileExists(src)) {
        try {
          await fs.promises.copyFile(src, dest);
          console.log(`Copied ${src} to ${dest}`);
        } catch (err) {
          console.error(`Error copying ${src} to ${dest}:`, err);
        }
      } else {
        console.warn(`Markdown file not found: ${src}`);
      }
    }

    // Merge Sidebar
    try {
      const typesSidebarPath = path.join(outDir, '_sidebar.md');
      const generalSidebarPath = path.join(docsDir, 'sidebar.md');

      if (await fileExists(typesSidebarPath) && await fileExists(generalSidebarPath)) {
        const typesSidebar = (await fs.promises.readFile(typesSidebarPath)).toString();
        const generalSidebar = (await fs.promises.readFile(generalSidebarPath)).toString();

        const fullSidebar = generalSidebar + '\n' + typesSidebar;
        await fs.promises.writeFile(path.join(outDir, 'sidebar.md'), fullSidebar);
        console.log('Merged sidebars successfully');
      } else {
        if (!await fileExists(typesSidebarPath)) console.warn(`Types sidebar not found: ${typesSidebarPath}`);
        if (!await fileExists(generalSidebarPath)) console.warn(`General sidebar not found: ${generalSidebarPath}`);
      }
    } catch (err) {
      console.error('Error merging sidebar files:', err);
    }

    console.log('Documentation copied successfully!');
  } catch (err) {
    console.error('Error processing documentation:', err);
  }
})();
