import Wrapper from "./Modules/dlpWrapper";

const dlp = new Wrapper("yt-dlp.exe");

dlp.getVideoOptions("https://www.youtube.com/watch?v=umBpRZNLID0");
dlp.downloadVideoById("https://www.youtube.com/watch?v=umBpRZNLID0", "18");
dlp.downloadVideoById("https://www.youtube.com/watch?v=umBpRZNLID0", "250");
