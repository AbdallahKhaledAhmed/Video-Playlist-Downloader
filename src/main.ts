import Wrapper from "./Modules/dlpWrapper";

const dlp = new Wrapper("utils/yt-dlp.exe");

async function main() {
  try {
    const data: any[] = await dlp.getVideoOptions(
      "https://www.youtube.com/watch?v=umBpRZNLID0"
    );

    // data.forEach((option, ind) => {
    //   const filesize = option.filesize
    //     ? (option.filesize / 1000000).toFixed(2)
    //     : "N/A";
    //   console.log(
    //     `${ind + 1}\t${option.format_id}+${
    //       option.audioFormatId
    //     }\t${filesize} MB\t${option.height}p${option.fps}fps`
    //   );
    // });

    // Now you can download like this:
    // dlp.downloadVideoById(url, data[1].combinedFormat); // 720p + audio
  } catch (err) {
    console.error(err);
  }
}
// dlp.downloadVideoById(
//   "https://www.youtube.com/watch?v=umBpRZNLID0",
//   "136+140-drc"
// );
// dlp.downloadVideoById("https://www.youtube.com/watch?v=umBpRZNLID0", "250");
main();
