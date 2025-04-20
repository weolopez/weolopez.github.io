Verify Java installation:
bash java -version
You should see output confirming the Java version. 
2. Create a Directory for Your Paper Server:
Navigate to your desired location:
bash cd ~ # Or another location like /opt, etc.
Create a new directory:
bash mkdir papermc_server  
Navigate into the directory:
bash cd papermc_server
 
3. Download PaperMC:
Find the latest PaperMC download link: Go to PaperMC downloads and find the download link for your desired Minecraft version (e.g., 1.21.5). 
Download PaperMC using wget:
bash wget <PASTE_THE_DOWNLOAD_LINK_HERE> -O paper.jar
(Replace <PASTE_THE_DOWNLOAD_LINK_HERE> with the link you copied.) 
4. Start the PaperMC Server (Initial Run):
Run the server for the first time:
bash java -Xms2G -Xmx2G -jar paper.jar nogui
(Adjust -Xms2G and -Xmx2G to allocate more or less RAM as needed. 2G means 2 Gigabytes.) 
Accept the EULA: This first run will fail because you haven't accepted the Minecraft EULA. It will generate a eula.txt file. 
Edit eula.txt:
bash nano eula.txt
Change eula=false to eula=true.
Save and exit (Ctrl+X, then Y, then Enter in nano). 
5. Run the PaperMC Server (Background):
Install screen (if you don't already have it):
bash sudo apt install screen # Debian/Ubuntu sudo yum install screen # Red Hat/CentOS
 
Create a screen session:
bash screen -S minecraft_server
 
Start the server within the screen session:
bash java -Xms2G -Xmx2G -jar paper.jar nogui
Detach from the screen session (Ctrl+A, then D). 
6. Access and Manage the Server:
Reattach to the screen session:
bash screen -r minecraft_server
Stop the server (if needed): Type stop in the server console within the screen session. 
Configure the server: Edit the server.properties file to customize settings like difficulty, gamemode, etc. 
Important Notes:
Security: Secure your server by setting strong passwords, enabling a whitelist, and considering other security measures. 
Resource Allocation: Allocate sufficient RAM based on your server's needs (number of players, plugins, etc.). 
Plugins: Install PaperMC plugins to enhance your server's features and functionality. 
This detailed guide should get your PaperMC server up and running on your Hostinger Linux VPS. 
