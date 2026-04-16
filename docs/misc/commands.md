ffmpeg -i input.mkv -vf "fps=10,scale=640:-1" output.webp

ffmpeg -i input.mkv \
     -vf "fps=10,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" \
     -loop 0 \
     -quality 80 \
     -compression_level 6 \
     -f segment \
     -segment_time 10 \
     -segment_format webp \
     -reset_timestamps 1 \
     output_%03d.webp

gcloud config set account student-02-c9e73183fbf7@qwiklabs.net


DURATION=405; SEGMENT=60; INPUT="input.mkv"; i=0; t=0
   while [ $t -lt $DURATION ]; do
       outfile=$(printf "output_%03d.webp" $i)
       ffmpeg -y -ss $t -i "$INPUT" -t $SEGMENT \
           -vf "fps=5,scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2" \
           -loop 0 \
           -quality 50 \
           -compression_level 6 \
           -an \
           "$outfile"
       i=$((i+1)); t=$((t+SEGMENT))
   done

ffmpeg -y -ss 0 -i input.mkv -t 10 \
       -vf "fps=10,scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2" \
       -loop 0 \
       -quality 50 \
       -compression_level 6 \
       -an \
       output_000.webp

input.mkv is 255M in size. When I executed the below command, the resulting output.webp was 46M in size. Please update the command to further reduce the size of the output.webp while maintaining a reasonable quality level. Consider adjusting the quality and compression settings to achieve a smaller file size without significantly compromising the visual quality of the output. I want the resulting output.webp to be around 20M in size. Please provide the updated command that achieves this goal.

ffmpeg -i input.mkv -vf "fps=10,scale=640:-1" output.webp

ffmpeg -i input.mkv \
  -vf "fps=6,scale=480:-1" \
  -loop 0 \
  -quality 75 \
  -compression_level 6 \
  -an \
  output_q75.webp

ffmpeg -i input.mkv \
  -vf "fps=10,scale=480:-1" \
  -loop 0 \
  -quality 65 \
  -compression_level 6 \
  -an \
  output_q65.webp

ffmpeg -i input.mkv -vf "fps=10,scale=480:-1" output_fps10_480.webp

ffmpeg -i input.mkv \
    -vf "fps=10,scale=480:-1" \
    -loop 0 \
    -compression_level 6 \
    -an \
    output_fps10_480_comp6.webp

# try next depending on quality and size of output_q65.webp
ffmpeg -i input.mkv \
  -vf "fps=10,scale=480:-1" \
  -loop 0 \
  -quality 55 \
  -compression_level 6 \
  -an \
  output_fps10_480_qual55.webp

# WORKING
DURATION=405; SEGMENT=60; INPUT="input.mkv"; i=0; t=0
while [ $t -lt $DURATION ]; do
    outfile=$(printf "output_%03d.webp" $i)
    ffmpeg -y -ss $t -i "$INPUT" -t $SEGMENT \
        -vf "fps=10,scale=480:-1" \
        -loop 0 \
        -quality 55 \
        -compression_level 6 \
        -an \
        "$outfile"
    i=$((i+1)); t=$((t+SEGMENT))
done




# To recompile the extension after making changes to the code, run the following command in the terminal:
dev@dev-VMware20-1:~/Shared/Developer/Private/dev_projects/vscode/extensions/editor_background_image$ npm run compile

> vscode-ext-parkour-background@0.2.0 compile
> node node_modules/typescript/bin/tsc -p ./


---

DURATION=405; SEGMENT=60; INPUT="input.mp4"; i=0; t=0
while [ $t -lt $DURATION ]; do
    outfile=$(printf "output_%03d.webp" $i)
    ffmpeg -y -ss $t -i "$INPUT" -t $SEGMENT \
        -vf "fps=10,scale=480:-1" \
        -loop 0 \
        -quality 55 \
        -compression_level 6 \
        -an \
        "$outfile"
    i=$((i+1)); t=$((t+SEGMENT))
done


---

 To list all active tmux sessions and then attach to the video_processing session, you can use these commands:                                                                                                                                                                         
                                                                                                                                                                                                                                                                                        
1 # List all active sessions
tmux ls         

4 # Attach to the video_processing session                                                                                                                                                                                                                                           
   5 tmux attach-session -t video_processing 